import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceProcessingService } from './attendance-processing.service';
import { CreateEventDto, BulkCreateEventsDto } from '../dto/event.dto';
import { AttendanceEvent, EventType, Role, EventSource, EventStatus } from '@prisma/client';
import { ShiftSelectionService } from './shift-selection.service';
import { PoliciesService } from '../../policies/policies.service';

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
            // Single optimized query — GIN index hit + lateral employee subquery in one round-trip.
            // Uses the exact expression the GIN index was built on:
            //   (settings -> 'attendance' -> 'apiKeys')
            const queryValue = JSON.stringify([{ key: apiKey }]);
            const results = await this.prisma.$queryRaw<any[]>`
                SELECT
                    p.id                  AS "policyId",
                    p.settings,
                    p."companyId",
                    p."isDefault",
                    c.name                AS "companyName",
                    c."employerNumber",
                    emp_agg."empCount",
                    emp_agg."empId",
                    emp_agg."empName",
                    emp_agg."empNo"
                FROM public.policies p
                LEFT JOIN public.companies c ON p."companyId" = c.id
                -- Lateral subquery: count + fetch employee info only when policy is non-default
                LEFT JOIN LATERAL (
                    SELECT
                        COUNT(*)::int              AS "empCount",
                        MIN(e.id)                  AS "empId",
                        MIN(e."nameWithInitials")   AS "empName",
                        MIN(e."employeeNo")         AS "empNo"
                    FROM public.employees e
                    WHERE e."policyId" = p.id
                      AND p."isDefault" = false
                ) emp_agg ON true
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

            // Resolve employee info from the lateral join result (no extra DB call needed)
            let employeeInfo: { id: string; name: string; employeeNo: number } | null = null;
            if (!policy.isDefault && policy.empCount === 1 && policy.empId) {
                employeeInfo = {
                    id: policy.empId,
                    name: policy.empName,
                    employeeNo: policy.empNo
                };
            }

            const result: any = {
                valid: true,
                type: policy.isDefault ? 'COMPANY' : (employeeInfo ? 'EMPLOYEE' : 'TEMPLATE'),
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
                employee: employeeInfo,
                restrictedToPolicyId: policy.isDefault ? null : policy.policyId
            };

            // Save to cache (5 min TTL)
            this.apiKeyCache.set(apiKey, {
                result,
                expiresAt: Date.now() + this.CACHE_TTL
            });

            // Update lastUsedAt throttled in background (fire-and-forget)
            this.throttleLastUsedUpdate(apiKey, policy.policyId);

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
                                WHEN elem ->> 'key' = ${apiKey} 
                                THEN jsonb_set(elem, '{lastUsedAt}', to_jsonb(${new Date().toISOString()}:: text))
                                ELSE elem 
                            END
        )
                        FROM jsonb_array_elements(settings -> 'attendance' -> 'apiKeys') AS elem
)
                )
                WHERE id = ${policyId}
`;
        } catch (e) {
            this.logger.error(`Failed to update lastUsedAt for key: ${e.message} `);
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
            restrictedToPolicyId?: string | null;
        },
    ): Promise<AttendanceEvent & { employeeName: string; shiftName: string }> {
        const companyId = verification.company.id;
        const apiKeyName = verification.apiKey.name;

        // 1. Resolve employee
        let employeeId = (dto as any).employeeId;
        let employeeName = verification.employee?.name;

        if (!employeeId) {
            const employee = await this.prisma.employee.findFirst({
                where: {
                    companyId,
                    employeeNo: dto.employeeNo,
                },
                select: { id: true, nameWithInitials: true, policyId: true }
            });

            if (!employee) {
                throw new NotFoundException(`Employee #${dto.employeeNo} not found in this company.`);
            }

            // Security Check: If the API key is restricted to a specific policy, ensure employee has that policy
            if (verification.restrictedToPolicyId && employee.policyId !== verification.restrictedToPolicyId) {
                throw new UnauthorizedException(
                    `This API key is restricted to employees assigned to a specific policy.Employee #${dto.employeeNo} is not covered.`,
                );
            }

            employeeId = employee.id;
            employeeName = employee.nameWithInitials;
        } else {
            const employee = await this.prisma.employee.findUnique({
                where: { id: employeeId },
                select: { id: true, nameWithInitials: true, policyId: true }
            });

            if (!employee) {
                throw new NotFoundException(`Employee not found.`);
            }

            // Security Check
            if (verification.restrictedToPolicyId && employee.policyId !== verification.restrictedToPolicyId) {
                throw new UnauthorizedException(
                    `This API key is restricted to employees assigned to a specific policy.`,
                );
            }

            employeeName = employee.nameWithInitials;
        }

        // Security Check: If it's an employee-level key, they can ONLY mark their own attendance
        if (verification.type === 'EMPLOYEE' && verification.employee) {
            if (employeeId !== verification.employee.id) {
                throw new UnauthorizedException(
                    `This API key is restricted to its owner only.`,
                );
            }
        }

        const eventTime = new Date(dto.eventTime);
        let eventType = dto.eventType;

        // Intelligent Type Detection
        if (!eventType) {
            const decision = await this.determineEventType(employeeId, eventTime);

            // If the system detected a missing checkout, insert it first
            if (decision.autoCheckoutAt) {
                await this.prisma.attendanceEvent.create({
                    data: {
                        employeeId: employeeId!,
                        companyId,
                        eventTime: decision.autoCheckoutAt,
                        eventType: 'OUT',
                        source: 'MANUAL',
                        remark: 'Auto checkout on shift end',
                        status: 'ACTIVE',
                        sessionId: decision.sessionId, // Link to previous unclosed session
                    },
                });
                // After auto-checkout, the current event is definitely an IN
                eventType = 'IN';
            } else {
                eventType = decision.type;
            }
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
            .catch(e => this.logger.error(`Processing error: ${e.message} `));

        return {
            ...event,
            employeeName: employeeName || 'Unknown',
            shiftName,
        };
    }

    /**
     * Intelligently determine if an event is IN or OUT.
     * Can optionally accept a 'lastEvent' context to avoid DB lookups (useful for bulk).
     * Now returns an object to indicate if an auto-checkout for the previous IN is needed.
     */
    private async determineEventType(
        employeeId: string,
        eventTime: Date,
        lastEventContext?: { eventTime: Date; eventType: EventType; sessionId?: string | null }
    ): Promise<{ type: EventType; autoCheckoutAt?: Date; sessionId?: string | null }> {
        let lastEvent = lastEventContext;

        if (!lastEvent) {
            const dbLastEvent = await this.prisma.attendanceEvent.findFirst({
                where: { employeeId, status: 'ACTIVE' },
                orderBy: { eventTime: 'desc' },
                select: { eventTime: true, eventType: true, sessionId: true }
            });
            if (dbLastEvent) {
                lastEvent = {
                    eventTime: new Date(dbLastEvent.eventTime),
                    eventType: dbLastEvent.eventType as EventType,
                    sessionId: dbLastEvent.sessionId
                };
            }
        }

        // If no last event or last event was OUT, this is definitely an IN
        if (!lastEvent || lastEvent.eventType === 'OUT') {
            return { type: 'IN' };
        }

        // Previous event was an IN. We are either closing it (OUT) or starting a new session (IN).
        const lastEventTime = lastEvent.eventTime;
        const diffMs = eventTime.getTime() - lastEventTime.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Check for shift specific maxOutTime
        const lastShift = await this.shiftSelectionService.getEffectiveShift(employeeId, lastEventTime);
        let maxOutDate: Date | null = null;

        if (lastShift?.maxOutTime) {
            const [maxH, maxM] = lastShift.maxOutTime.split(':').map(Number);
            maxOutDate = new Date(lastEventTime);
            maxOutDate.setHours(maxH, maxM, 0, 0);

            // Handle cross-day shifts
            if (maxOutDate < lastEventTime) {
                maxOutDate.setDate(maxOutDate.getDate() + 1);
            }
        }

        // Logic check:
        // 1. If we have shift info, check if we are past 24h OR past the maxOutTime
        // 2. If no shift info, just do the standard 24h window check
        const isPast24h = diffHours >= 24;
        const isPastMaxOut = lastShift && maxOutDate && eventTime > maxOutDate;

        if (lastShift && (isPast24h || isPastMaxOut)) {
            // If the shift policy enables auto-checkout, provide the timestamp
            if (lastShift.autoClockOut && lastShift.endTime) {
                let autoCheckoutAt = new Date(lastEventTime);
                const [h, m] = lastShift.endTime.split(':').map(Number);
                autoCheckoutAt.setHours(h, m, 0, 0);

                if (autoCheckoutAt < lastEventTime) {
                    autoCheckoutAt.setDate(autoCheckoutAt.getDate() + 1);
                }

                if (autoCheckoutAt >= eventTime) {
                    autoCheckoutAt = new Date(eventTime.getTime() - 1000);
                }

                return { type: 'IN', autoCheckoutAt, sessionId: lastEvent.sessionId };
            }

            // If auto-checkout is DISABLED (or no end time), we still start a new IN, 
            // but we don't inject an auto-OUT record.
            return { type: 'IN' };
        }

        // If no shift metadata, or we are within the shift window
        if (isPast24h) {
            return { type: 'IN' };
        }

        // Normal case: within 24h window and no reason to auto-checkout
        return { type: 'OUT' };
    }

    /**
     * Optimized Bulk creation with intelligent type detection
     */
    async bulkCreateExternalEvents(
        dto: BulkCreateEventsDto,
        verification: {
            type: 'COMPANY' | 'EMPLOYEE';
            company: { id: string };
            employee?: { id: string; name: string; employeeNo: number };
            apiKey: { name: string };
            restrictedToPolicyId?: string | null;
        },
    ) {
        const companyId = verification.company.id;
        const apiKeyName = verification.apiKey.name;

        // 1. Sort all events chronologically to ensure proper type detection
        const sortedEvents = [...dto.events].sort(
            (a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime()
        );

        const uniqueEmployeeNos = [...new Set(sortedEvents.map(e => e.employeeNo).filter(Boolean) as number[])];

        // 2. Bulk Resolve Employees
        const employees = await this.prisma.employee.findMany({
            where: { companyId, employeeNo: { in: uniqueEmployeeNos } },
            select: { id: true, employeeNo: true, policyId: true }
        });

        const empMap = new Map(employees.map(e => [e.employeeNo, e]));
        const results: any[] = [];
        const validEvents: any[] = [];
        const processQueue = new Set<string>();

        const lastStateMap = new Map<string, { eventTime: Date; eventType: EventType; sessionId?: string | null }>();

        // 4. Process events
        for (const eventDto of sortedEvents) {
            let decision: { type: EventType; autoCheckoutAt?: Date; sessionId?: string | null } | undefined;
            const employee = empMap.get(eventDto.employeeNo!);
            const employeeId = employee?.id;

            if (!employeeId) {
                results.push({ employeeNo: eventDto.employeeNo, status: 'failed', error: 'Employee not found' });
                continue;
            }

            // Security Check: Policy scoping
            if (verification.restrictedToPolicyId && employee.policyId !== verification.restrictedToPolicyId) {
                results.push({
                    employeeNo: eventDto.employeeNo,
                    status: 'failed',
                    error: 'Policy mismatch: API key not valid for this employee'
                });
                continue;
            }

            // Security Check: Personal key
            if (verification.type === 'EMPLOYEE' && verification.employee) {
                if (employeeId !== verification.employee.id) {
                    results.push({
                        employeeNo: eventDto.employeeNo,
                        status: 'failed',
                        error: `This API key is restricted to its owner only.`
                    });
                    continue;
                }
            }

            const eventTime = new Date(eventDto.eventTime);
            let eventType = eventDto.eventType;

            // Intelligent Type Detection for Bulk
            if (!eventType) {
                // Determine type using batch context if available
                const lastInBatch = lastStateMap.get(employeeId);
                decision = await this.determineEventType(employeeId, eventTime, lastInBatch);

                if (decision.autoCheckoutAt) {
                    // Create the missing OUT event in the list
                    const autoOut = {
                        employeeId,
                        companyId,
                        eventTime: decision.autoCheckoutAt,
                        eventType: 'OUT' as EventType,
                        source: 'MANUAL' as const,
                        remark: 'Auto checkout on shift end',
                        status: 'ACTIVE' as const,
                        sessionId: decision.sessionId, // Link to previous unclosed session
                    };
                    validEvents.push(autoOut);

                    // Update state to reflect this auto-checkout
                    lastStateMap.set(employeeId, {
                        eventTime: decision.autoCheckoutAt,
                        eventType: 'OUT',
                        sessionId: decision.sessionId
                    });

                    // The current event now becomes an IN
                    eventType = 'IN';
                } else {
                    eventType = decision.type;
                }
            }

            // Update state for next event in batch
            lastStateMap.set(employeeId, {
                eventTime,
                eventType: eventType!,
                sessionId: eventType === 'IN' ? null : decision?.sessionId
            });

            validEvents.push({
                employeeId,
                companyId,
                eventTime,
                eventType: eventType!, // Now guaranteed to be set
                source: 'API_KEY' as const,
                apiKeyName,
                device: eventDto.device,
                location: eventDto.location,
                latitude: eventDto.latitude,
                longitude: eventDto.longitude,
                remark: eventDto.remark,
                status: 'ACTIVE' as const,
            });

            const dateStr = eventTime.toISOString().split('T')[0];
            processQueue.add(`${employeeId}:${dateStr} `);
        }

        // 5. Bulk Insert
        if (validEvents.length > 0) {
            await this.prisma.attendanceEvent.createMany({ data: validEvents });
        }

        // 6. Async Processing
        processQueue.forEach(item => {
            const [empId, dateStr] = item.split(':');
            this.processingService.processEmployeeDate(empId, new Date(dateStr))
                .catch(e => this.logger.error(`Bulk processing error: ${e.message} `));
        });

        return {
            success: true,
            inserted: validEvents.length,
            failed: results.filter(r => r.status === 'failed').length,
            results: [
                ...results,
                ...validEvents.map(e => ({
                    employeeNo: employees.find(emp => emp.id === e.employeeId)?.employeeNo,
                    status: 'success'
                }))
            ]
        };
    }

}
