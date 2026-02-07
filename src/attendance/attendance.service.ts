import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceProcessingService } from './services/attendance-processing.service';
import { PoliciesService } from '../policies/policies.service';
import { CreateEventDto, BulkCreateEventsDto } from './dto/event.dto';
import {
    UpdateSessionDto,
    SessionQueryDto,
    EventQueryDto,
} from './dto/session.dto';
import { EventSource, AttendanceEvent, AttendanceSession } from '@prisma/client';

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly processingService: AttendanceProcessingService,
        private readonly policiesService: PoliciesService,
    ) { }

    /**
     * Create manual event (from employer portal)
     */
    async createManualEvent(
        dto: CreateEventDto,
        source: EventSource = 'MANUAL',
    ): Promise<AttendanceEvent> {
        this.logger.log(
            `Creating ${source} event for employee ${dto.employeeId || dto.employeeNo}`,
        );

        // Resolve employee
        let employeeId: string;
        let companyId: string;

        if (dto.employeeId) {
            const employee = await this.prisma.employee.findUnique({
                where: { id: dto.employeeId },
                select: { id: true, companyId: true },
            });
            if (!employee) {
                throw new NotFoundException('Employee not found');
            }
            employeeId = employee.id;
            companyId = employee.companyId;
        } else if (dto.employeeNo) {
            // For API key entries, resolve by employeeNo
            throw new BadRequestException(
                'Employee number resolution requires company context',
            );
        } else {
            throw new BadRequestException('Either employeeId or employeeNo required');
        }

        // Create event
        const event = await this.prisma.attendanceEvent.create({
            data: {
                employeeId,
                companyId,
                eventTime: new Date(dto.eventTime),
                eventType: dto.eventType,
                source,
                device: dto.device || 'Manual Entry',
                location: dto.location,
                latitude: dto.latitude,
                longitude: dto.longitude,
                remark: dto.remark,
                status: 'ACTIVE',
            },
        });

        // Trigger async processing
        const eventDate = new Date(dto.eventTime);
        this.processingService
            .processEmployeeDate(employeeId, eventDate)
            .catch((error) => {
                this.logger.error(`Failed to process event: ${error.message}`);
            });

        return event;
    }

    /**
     * Create event from external API (with API key)
     */
    async createExternalEvent(
        dto: CreateEventDto,
        companyId: string,
        apiKeyName: string,
    ): Promise<AttendanceEvent> {
        this.logger.log(
            `Creating API_KEY event for employee ${dto.employeeNo} via ${apiKeyName}`,
        );

        // Resolve employee by employeeNo
        const employee = await this.prisma.employee.findFirst({
            where: {
                companyId,
                employeeNo: dto.employeeNo,
            },
        });

        if (!employee) {
            throw new NotFoundException(
                `Employee ${dto.employeeNo} not found in company`,
            );
        }

        // Create event
        const event = await this.prisma.attendanceEvent.create({
            data: {
                employeeId: employee.id,
                companyId,
                eventTime: new Date(dto.eventTime),
                eventType: dto.eventType,
                source: 'API_KEY',
                apiKeyName,
                device: dto.device,
                location: dto.location,
                latitude: dto.latitude,
                longitude: dto.longitude,
                status: 'ACTIVE',
            },
        });

        // Trigger async processing
        const eventDate = new Date(dto.eventTime);
        this.processingService
            .processEmployeeDate(employee.id, eventDate)
            .catch((error) => {
                this.logger.error(`Failed to process event: ${error.message}`);
            });

        return event;
    }

    /**
     * Bulk create events from external API
     */
    async bulkCreateExternalEvents(
        dto: BulkCreateEventsDto,
        companyId: string,
        apiKeyName: string,
    ) {
        this.logger.log(
            `Bulk creating ${dto.events.length} events via ${apiKeyName}`,
        );

        const results: Array<{
            employeeNo: number;
            status: 'success' | 'failed';
            eventId?: string;
            error?: string;
        }> = [];
        let inserted = 0;
        let failed = 0;

        for (const eventDto of dto.events) {
            try {
                const event = await this.createExternalEvent(
                    eventDto,
                    companyId,
                    apiKeyName,
                );
                results.push({
                    employeeNo: eventDto.employeeNo!,
                    status: 'success' as const,
                    eventId: event.id,
                });
                inserted++;
            } catch (error) {
                results.push({
                    employeeNo: eventDto.employeeNo!,
                    status: 'failed' as const,
                    error: error.message,
                });
                failed++;
            }
        }

        return {
            success: failed === 0,
            inserted,
            failed,
            results,
        };
    }

    /**
     * Get sessions with pagination
     */
    async getSessions(query: SessionQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 15;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (query.companyId) {
            where.companyId = query.companyId;
        }

        if (query.employeeId) {
            where.employeeId = query.employeeId;
        }

        if (query.startDate || query.endDate) {
            where.date = {};
            if (query.startDate) {
                where.date.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                const end = new Date(query.endDate);
                end.setHours(23, 59, 59, 999);
                where.date.lte = end;
            }
        }

        const [items, total] = await Promise.all([
            this.prisma.attendanceSession.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date: 'desc' },
                include: {
                    employee: {
                        select: {
                            employeeNo: true,
                            nameWithInitials: true,
                            fullName: true,
                            photo: true,
                        },
                    },
                },
            }),
            this.prisma.attendanceSession.count({ where }),
        ]);

        return {
            items,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get single session by ID
     */
    async getSession(id: string): Promise<AttendanceSession> {
        this.logger.log(`Fetching session ${id}`);
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id },
            include: {
                employee: {
                    select: {
                        employeeNo: true,
                        nameWithInitials: true,
                        fullName: true,
                        photo: true,
                    },
                },
            },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        return session;
    }

    /**
     * Get events with pagination
     */
    async getEvents(query: EventQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (query.companyId) {
            where.companyId = query.companyId;
        }

        if (query.employeeId) {
            where.employeeId = query.employeeId;
        }

        if (query.startDate || query.endDate) {
            where.eventTime = {};
            if (query.startDate) {
                where.eventTime.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                const end = new Date(query.endDate);
                end.setHours(23, 59, 59, 999);
                where.eventTime.lte = end;
            }
        }

        if (query.status) {
            where.status = query.status;
        }

        const [items, total] = await Promise.all([
            this.prisma.attendanceEvent.findMany({
                where,
                skip,
                take: limit,
                orderBy: { eventTime: 'desc' },
                include: {
                    employee: {
                        select: {
                            employeeNo: true,
                            nameWithInitials: true,
                            fullName: true,
                            photo: true,
                        },
                    },
                },
            }),
            this.prisma.attendanceEvent.count({ where }),
        ]);

        return {
            items,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Update session
     */
    async updateSession(
        id: string,
        dto: UpdateSessionDto,
    ): Promise<AttendanceSession> {
        this.logger.log(`Updating session ${id}`);

        const session = await this.prisma.attendanceSession.findUnique({
            where: { id },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        const updateData: any = {
            ...dto,
            checkInTime: dto.checkInTime === null ? null : (dto.checkInTime ? new Date(dto.checkInTime) : undefined),
            checkOutTime: dto.checkOutTime === null ? null : (dto.checkOutTime ? new Date(dto.checkOutTime) : undefined),
            manuallyEdited: true,
        };

        // Handle shift snapshot if shiftId is being updated
        if (dto.shiftId !== undefined) {
            if (dto.shiftId === null) {
                // Clear shift snapshots
                updateData.shiftName = null;
                updateData.shiftStartTime = null;
                updateData.shiftEndTime = null;
                updateData.shiftBreakMinutes = null;
            } else {
                // Fetch shift details from effective policy
                const policy = await this.policiesService.getEffectivePolicy(session.employeeId);
                const shiftList = policy.shifts?.list || [];
                const shift = shiftList.find((s: any) => s.id === dto.shiftId);

                if (shift) {
                    this.logger.log(`Found shift details: ${shift.name}, ${shift.startTime}-${shift.endTime}`);
                    updateData.shiftName = shift.name;
                    updateData.shiftStartTime = shift.startTime;
                    updateData.shiftEndTime = shift.endTime;
                    updateData.shiftBreakMinutes = shift.breakTime;
                } else {
                    this.logger.warn(`Shift ID ${dto.shiftId} not found in employee policy`);
                }
            }
        }

        return this.prisma.attendanceSession.update({
            where: { id },
            data: updateData,
        });
    }

    /**
     * Delete session
     */
    async deleteSession(id: string): Promise<{ message: string }> {
        this.logger.log(`Deleting session ${id}`);

        const session = await this.prisma.attendanceSession.findUnique({
            where: { id },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        // Mark events as IGNORED and unlink them
        await this.prisma.attendanceEvent.updateMany({
            where: { sessionId: id },
            data: {
                sessionId: null,
                status: 'IGNORED'
            },
        });

        // Delete session
        await this.prisma.attendanceSession.delete({
            where: { id },
        });

        return { message: 'Session deleted successfully' };
    }

    /**
     * Verify API key and return company info
     */
    async verifyApiKey(apiKey: string): Promise<{
        valid: boolean;
        company?: any;
        apiKey?: any;
    }> {
        // Find company with this API key in attendance policy
        const policy = await this.prisma.policy.findFirst({
            where: {
                companyId: { not: null },
            },
            include: {
                company: true,
            },
        });

        if (!policy || !policy.settings || !policy.company) {
            return { valid: false };
        }

        const settings = policy.settings as any;
        const attendanceConfig = settings.attendance;

        if (!attendanceConfig || !attendanceConfig.apiKeys) {
            return { valid: false };
        }

        const keyConfig = attendanceConfig.apiKeys.find(
            (k: any) => k.key === apiKey && k.enabled,
        );

        if (!keyConfig) {
            return { valid: false };
        }

        // Update last used timestamp
        // TODO: Implement lastUsedAt update

        return {
            valid: true,
            company: {
                id: policy.company.id,
                name: policy.company.name,
                employerNumber: policy.company.employerNumber,
            },
            apiKey: {
                id: keyConfig.id,
                name: keyConfig.name,
                lastUsedAt: new Date(),
            },
        };
    }
}
