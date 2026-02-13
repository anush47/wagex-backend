import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceProcessingService } from './attendance-processing.service';
import { CreateEventDto, BulkCreateEventsDto } from '../dto/event.dto';
import { AttendanceEvent, EventType, Role } from '@prisma/client';
import { ShiftSelectionService } from './shift-selection.service';

@Injectable()
export class AttendanceExternalService {
    private readonly logger = new Logger(AttendanceExternalService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly processingService: AttendanceProcessingService,
        private readonly shiftSelectionService: ShiftSelectionService,
    ) { }

    // Simple in-memory cache for API key verification (5-minute TTL)
    private apiKeyCache = new Map<string, { result: any; expiresAt: number }>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    /**
     * Verify API key using GIN index optimized query with in-memory caching
     */
    async verifyApiKey(apiKey: string): Promise<{
        valid: boolean;
        type?: 'COMPANY' | 'EMPLOYEE';
        company?: { id: string; name: string; employerNumber?: string };
        employee?: { id: string; name: string; employeeNo: number };
        apiKey?: { id: string; name: string; lastUsedAt: Date };
    }> {
        // 1. Check Cache
        const cached = this.apiKeyCache.get(apiKey);
        if (cached && cached.expiresAt > Date.now()) {
            // Update lastUsedAt in background (throttled)
            this.throttleLastUsedUpdate(apiKey, cached.result.policyId);
            return cached.result;
        }

        try {
            // Match the GIN index expression exactly: (settings -> 'attendance' -> 'apiKeys')
            const queryValue = JSON.stringify([{ key: apiKey }]);
            const results = await this.prisma.$queryRaw<any[]>`
                SELECT 
                    p.id as "policyId",
                    p.settings,
                    p."companyId",
                    p."employeeId",
                    c.name as "companyName",
                    c."employerNumber",
                    e.id as "empRecordId",
                    e."nameWithInitials" as "empName",
                    e."employeeNo",
                    e."companyId" as "empCompanyId",
                    ec.name as "empCompanyName",
                    ec."employerNumber" as "empCompanyNumber"
                FROM public.policies p
                LEFT JOIN public.companies c ON p."companyId" = c.id
                LEFT JOIN public.employees e ON p."employeeId" = e.id
                LEFT JOIN public.companies ec ON e."companyId" = ec.id
                WHERE (p.settings -> 'attendance' -> 'apiKeys') @> ${queryValue}::jsonb
                LIMIT 1
            `;

            if (!results || results.length === 0) {
                return { valid: false };
            }

            const policy = results[0];
            const settings = policy.settings as any;
            const keyConfig = settings.attendance?.apiKeys?.find(
                (k: any) => k.key === apiKey
            );

            if (!keyConfig || keyConfig.enabled === false) {
                return { valid: false };
            }

            let result: any = { valid: false };

            if (policy.companyId) {
                result = {
                    valid: true,
                    type: 'COMPANY',
                    policyId: policy.policyId,
                    company: {
                        id: policy.companyId,
                        name: policy.companyName,
                        employerNumber: policy.employerNumber,
                    },
                    apiKey: {
                        id: keyConfig.id,
                        name: keyConfig.name,
                        lastUsedAt: new Date(),
                    },
                };
            } else if (policy.employeeId) {
                result = {
                    valid: true,
                    type: 'EMPLOYEE',
                    policyId: policy.policyId,
                    company: {
                        id: policy.empCompanyId,
                        name: policy.empCompanyName,
                        employerNumber: policy.empCompanyNumber,
                    },
                    employee: {
                        id: policy.empRecordId,
                        name: policy.empName,
                        employeeNo: policy.employeeNo,
                    },
                    apiKey: {
                        id: keyConfig.id,
                        name: keyConfig.name,
                        lastUsedAt: new Date(),
                    },
                };
            }

            // 2. Save to Cache
            if (result.valid) {
                this.apiKeyCache.set(apiKey, {
                    result,
                    expiresAt: Date.now() + this.CACHE_TTL
                });
                this.throttleLastUsedUpdate(apiKey, policy.policyId);
            }

            return result;
        } catch (error) {
            this.logger.error(`Database error during API key verification: ${error.message}`);
        }

        return { valid: false };
    }

    private lastUpdateMap = new Map<string, number>();

    /**
     * Throttled update of lastUsedAt in the database JSON
     */
    private async throttleLastUsedUpdate(apiKey: string, policyId: string) {
        const now = Date.now();
        const lastUpdate = this.lastUpdateMap.get(apiKey) || 0;

        // Only update DB once every 30 minutes to reduce write load
        if (now - lastUpdate < 30 * 60 * 1000) return;

        this.lastUpdateMap.set(apiKey, now);

        try {
            // Optimized JSONB update: Update lastUsedAt for the specific key in the array
            await this.prisma.$executeRaw`
                UPDATE public.policies
                SET settings = jsonb_set(
                    settings,
                    '{attendance,apiKeys}',
                    (
                        SELECT jsonb_agg(
                            CASE 
                                WHEN elem->>'key' = ${apiKey} 
                                THEN jsonb_set(elem, '{lastUsedAt}', to_jsonb(${new Date().toISOString()}::text))
                                ELSE elem 
                            END
                        )
                        FROM jsonb_array_elements(settings->'attendance'->'apiKeys') AS elem
                    )
                )
                WHERE id = ${policyId}
            `;
        } catch (e) {
            this.logger.error(`Failed to update lastUsedAt for key: ${e.message}`);
        }
    }

    /**
     * Create event from external API
     */
    async createExternalEvent(
        dto: CreateEventDto,
        verification: {
            type: 'COMPANY' | 'EMPLOYEE';
            company: { id: string };
            employee?: { id: string; name: string; employeeNo: number };
            apiKey: { name: string };
        },
    ): Promise<AttendanceEvent & { employeeName: string; shiftName: string }> {
        const companyId = verification.company.id;
        const apiKeyName = verification.apiKey.name;

        // Security Check: If it's an employee-level key, they can ONLY mark their own attendance
        if (verification.type === 'EMPLOYEE' && verification.employee) {
            if (dto.employeeNo !== undefined && dto.employeeNo !== verification.employee.employeeNo) {
                throw new UnauthorizedException(
                    `This API key is restricted to Employee #${verification.employee.employeeNo}. Cannot mark attendance for #${dto.employeeNo}.`,
                );
            }
            // Use the verified employee ID directly for maximum security
            // Assuming CreateEventDto can accept employeeId
            (dto as any).employeeId = verification.employee.id;
        }

        // Resolve employee
        let employeeId = (dto as any).employeeId;
        let employeeName = verification.employee?.name;

        if (!employeeId) {
            const employee = await this.prisma.employee.findFirst({
                where: {
                    companyId,
                    employeeNo: dto.employeeNo,
                },
                select: { id: true, nameWithInitials: true }
            });

            if (!employee) {
                throw new NotFoundException(`Employee #${dto.employeeNo} not found in this company.`);
            }
            employeeId = employee.id;
            employeeName = employee.nameWithInitials;
        } else if (!employeeName) {
            const employee = await this.prisma.employee.findUnique({
                where: { id: employeeId },
                select: { nameWithInitials: true }
            });
            employeeName = employee?.nameWithInitials;
        }

        const eventTime = new Date(dto.eventTime);
        let eventType = dto.eventType;

        // Intelligent Type Detection
        if (!eventType) {
            eventType = await this.determineEventType(employeeId, eventTime);
        }

        // 3. Resolve Shift Name
        const shift = await this.shiftSelectionService.getEffectiveShift(
            employeeId!,
            eventTime,
            eventTime
        );
        const shiftName = shift?.name || 'No Shift Assigned';

        const event = await this.prisma.attendanceEvent.create({
            data: {
                employeeId: employeeId!,
                companyId,
                eventTime,
                eventType: eventType!,
                source: 'API_KEY',
                apiKeyName,
                device: dto.device,
                location: dto.location,
                latitude: dto.latitude,
                longitude: dto.longitude,
                remark: dto.remark,
                status: 'ACTIVE',
            },
        });

        // Trigger processing
        this.processingService.processEmployeeDate(employeeId!, eventTime)
            .catch(e => this.logger.error(`Processing error: ${e.message}`));

        return {
            ...event,
            employeeName: employeeName || 'Unknown',
            shiftName,
        };
    }

    /**
     * Intelligently determine if an event is IN or OUT 
     */
    private async determineEventType(employeeId: string, eventTime: Date): Promise<EventType> {
        const lastEvent = await this.prisma.attendanceEvent.findFirst({
            where: { employeeId, status: 'ACTIVE' },
            orderBy: { eventTime: 'desc' },
        });

        if (!lastEvent) {
            return 'IN';
        }

        const lastEventTime = new Date(lastEvent.eventTime);
        const diffMs = eventTime.getTime() - lastEventTime.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // If last record was > 24hrs ago, it's always an IN
        if (diffHours >= 24) {
            return 'IN';
        }

        // Check for shift specific maxOutTime
        const lastShift = await this.shiftSelectionService.getEffectiveShift(employeeId, lastEventTime);

        if (lastShift?.maxOutTime) {
            const [maxH, maxM] = lastShift.maxOutTime.split(':').map(Number);
            const maxOutDate = new Date(lastEventTime);
            maxOutDate.setHours(maxH, maxM, 0, 0);

            // If maxOutTime is "before" lastEventTime in day cycle, it belongs to next day
            if (maxOutDate < lastEventTime) {
                maxOutDate.setDate(maxOutDate.getDate() + 1);
            }

            // If within shift's max end time, it is an OUT. Otherwise start new IN.
            return eventTime <= maxOutDate ? 'OUT' : 'IN';
        }

        // If no maxOutTime is defined, 24hrs is the default window (already checked if > 24)
        // Since we are < 24hrs, we treat it as an OUT to complete the session.
        return 'OUT';
    }

    /**
     * Optimized Bulk creation
     */
    async bulkCreateExternalEvents(
        dto: BulkCreateEventsDto,
        verification: {
            type: 'COMPANY' | 'EMPLOYEE';
            company: { id: string };
            employee?: { id: string; name: string; employeeNo: number };
            apiKey: { name: string };
        },
    ) {
        const companyId = verification.company.id;
        const apiKeyName = verification.apiKey.name;

        const uniqueEmployeeNos = [...new Set(dto.events.map(e => e.employeeNo).filter(Boolean) as number[])];

        // 1. Bulk Resolve Employees
        const employees = await this.prisma.employee.findMany({
            where: { companyId, employeeNo: { in: uniqueEmployeeNos } },
            select: { id: true, employeeNo: true }
        });

        const empMap = new Map(employees.map(e => [e.employeeNo, e.id]));
        const results: any[] = [];
        const validEvents: any[] = [];
        const processQueue = new Set<string>(); // Set of "employeeId:date"

        // 2. Prepare Data
        for (const eventDto of dto.events) {
            // Security Check: If it's an employee-level key, they can ONLY mark their own attendance
            if (verification.type === 'EMPLOYEE' && verification.employee) {
                if (eventDto.employeeNo !== undefined && eventDto.employeeNo !== verification.employee.employeeNo) {
                    results.push({
                        employeeNo: eventDto.employeeNo,
                        status: 'failed',
                        error: `This API key is restricted to Employee #${verification.employee.employeeNo}.`
                    });
                    continue;
                }
            }

            const employeeId = empMap.get(eventDto.employeeNo!);
            if (!employeeId) {
                results.push({ employeeNo: eventDto.employeeNo, status: 'failed', error: 'Employee not found' });
                continue;
            }

            const eventTime = new Date(eventDto.eventTime);
            validEvents.push({
                employeeId,
                companyId,
                eventTime,
                eventType: eventDto.eventType,
                source: 'API_KEY',
                apiKeyName,
                device: eventDto.device,
                location: eventDto.location,
                latitude: eventDto.latitude,
                longitude: eventDto.longitude,
                remark: eventDto.remark,
                status: 'ACTIVE',
            });

            // Mark for processing (one per unique employee/day)
            const dateStr = eventTime.toISOString().split('T')[0];
            processQueue.add(`${employeeId}:${dateStr}`);
        }

        // 3. Bulk Insert
        if (validEvents.length > 0) {
            await this.prisma.attendanceEvent.createMany({ data: validEvents });
        }

        // 4. Async Processing (Triggered once per employee-day)
        processQueue.forEach(item => {
            const [empId, dateStr] = item.split(':');
            this.processingService.processEmployeeDate(empId, new Date(dateStr))
                .catch(e => this.logger.error(`Bulk processing error: ${e.message}`));
        });

        return {
            success: true,
            inserted: validEvents.length,
            failed: results.filter(r => r.status === 'failed').length,
            results: [...results, ...validEvents.map(e => ({
                employeeNo: employees.find(emp => emp.id === e.employeeId)?.employeeNo,
                status: 'success'
            }))]
        };
    }
}
