import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceProcessingService } from './services/attendance-processing.service';
import { AttendanceCalculationService } from './services/attendance-calculation.service';
import { LeaveIntegrationService } from './services/leave-integration.service';
import { PoliciesService } from '../policies/policies.service';
import { CreateEventDto, BulkCreateEventsDto } from './dto/event.dto';
import {
    UpdateSessionDto,
    SessionQueryDto,
    EventQueryDto,
    CreateSessionDto,
} from './dto/session.dto';
import { EventSource, AttendanceEvent, AttendanceSession } from '@prisma/client';

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly processingService: AttendanceProcessingService,
        private readonly policiesService: PoliciesService,
        private readonly calculationService: AttendanceCalculationService,
        private readonly leaveService: LeaveIntegrationService,
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

        // Process immediately to ensure linking
        const eventDate = new Date(dto.eventTime);
        try {
            const sessions = await this.processingService.processEmployeeDate(employeeId, eventDate);
            this.logger.log(`Processed ${sessions.length} sessions for employee ${employeeId} on ${eventDate.toISOString()}`);
        } catch (error) {
            this.logger.error(`Failed to process event on creation: ${error.message}`);
        }

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

        // Process immediately to ensure linking
        const eventDate = new Date(dto.eventTime);
        try {
            const sessions = await this.processingService.processEmployeeDate(employee.id, eventDate);
            this.logger.log(`Processed ${sessions.length} sessions for employee ${employee.id} on ${eventDate.toISOString()}`);
        } catch (error) {
            this.logger.error(`Failed to process external event: ${error.message}`);
        }

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
                end.setUTCHours(23, 59, 59, 999);
                where.date.lte = end;
            }
        }

        if (query.isPending) {
            where.OR = [
                { inApprovalStatus: 'PENDING' },
                { outApprovalStatus: 'PENDING' }
            ];
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
                    workHoliday: true,
                    payrollHoliday: true,
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
                workHoliday: true,
                payrollHoliday: true,
            },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        return session;
    }

    /**
     * Get events for a specific session
     */
    async getSessionEvents(sessionId: string) {
        this.logger.log(`Fetching events for session ${sessionId}`);

        const events = await this.prisma.attendanceEvent.findMany({
            where: { sessionId },
            orderBy: { eventTime: 'asc' },
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

        return events;
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
                end.setUTCHours(23, 59, 59, 999);
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

        this.logger.log(`[ATTENDANCE_LOGIC] updateSession Input: ${JSON.stringify({
            in: dto.checkInTime,
            out: dto.checkOutTime,
            work: dto.workMinutes
        })}`);

        const updateData: any = {
            ...dto,
            checkInTime: dto.checkInTime === null ? null : (dto.checkInTime ? new Date(dto.checkInTime) : undefined),
            checkOutTime: dto.checkOutTime === null ? null : (dto.checkOutTime ? new Date(dto.checkOutTime) : undefined),
            manuallyEdited: true,
        };

        this.logger.log(`[ATTENDANCE_LOGIC] updateData conversion: IN: ${updateData.checkInTime?.toISOString() || 'NULL'}, OUT: ${updateData.checkOutTime?.toISOString() || 'NULL'}`);

        // Update session logical date if checkInTime has shifted to another day
        if (dto.checkInTime) {
            const dateObj = new Date(dto.checkInTime);
            const newCheckInDate = new Date(Date.UTC(
                dateObj.getUTCFullYear(),
                dateObj.getUTCMonth(),
                dateObj.getUTCDate()
            ));

            if (newCheckInDate.getTime() !== session.date.getTime()) {
                this.logger.log(`Shifting session date from ${session.date.toISOString()} to ${newCheckInDate.toISOString()}`);

                // Check if a session already exists for this employee on the new date
                const conflict = await this.prisma.attendanceSession.findUnique({
                    where: {
                        employeeId_date: {
                            employeeId: session.employeeId,
                            date: newCheckInDate,
                        }
                    }
                });

                if (conflict && conflict.id !== id) {
                    throw new BadRequestException(`A session already exists for this employee on ${newCheckInDate.toISOString().split('T')[0]}.`);
                }

                updateData.date = newCheckInDate;
            }
        }

        // Handle break override logic
        if (dto.isBreakOverrideActive !== undefined) {
            updateData.isBreakOverrideActive = dto.isBreakOverrideActive;
        }

        // --- Centralized Calculation Start ---
        // Resolve current state for calculation
        const effectiveCheckIn = updateData.checkInTime !== undefined ? updateData.checkInTime : session.checkInTime;
        const effectiveCheckOut = updateData.checkOutTime !== undefined ? updateData.checkOutTime : session.checkOutTime;
        const effectiveShiftId = dto.shiftId !== undefined ? (dto.shiftId === "none" ? null : dto.shiftId) : session.shiftId;
        const effectiveDate = updateData.date || session.date;

        // Fetch effective policy for shift and calendar resolution
        const policy = await this.policiesService.getEffectivePolicy(session.employeeId);
        const policySettings = policy as any;

        const workCalendarId = policySettings.workingDays?.workingCalendar || policySettings.attendance?.calendarId || policySettings.calendarId;
        const payrollCalendarId = policySettings.workingDays?.payrollCalendar || policySettings.payrollConfiguration?.calendarId || policySettings.calendarId;

        // Fetch shift details if needed for calculation
        let calcShift: any = null;
        if (effectiveShiftId) {
            calcShift = policySettings.shifts?.list?.find((s: any) => s.id === effectiveShiftId);
        }

        // Fetch leaves for the session date
        const leaves = await this.leaveService.getApprovedLeaves(session.employeeId, effectiveDate);

        // Determine break minutes based on override status
        const effectiveBreakOverride = dto.isBreakOverrideActive !== undefined ? dto.isBreakOverrideActive : session.isBreakOverrideActive;

        let breakMinutesToUse: number;
        if (effectiveBreakOverride) {
            // If break override is active, use the breakMinutes value from the DTO (manual override) or existing session value
            breakMinutesToUse = dto.breakMinutes ?? session.breakMinutes ?? 0;
        } else {
            // If break override is not active, calculate break from events or use shift break
            // Get events for this session to calculate breaks from IN/OUT pairs
            const sessionEvents = await this.prisma.attendanceEvent.findMany({
                where: { sessionId: id },
                orderBy: { eventTime: 'asc' }
            });

            if (sessionEvents.length > 0) {
                // Calculate breaks from the actual IN/OUT pairs in the session
                const calculatedBreaks = this.calculationService.calculateBreaksFromEvents(sessionEvents);

                // If calculated break is smaller than the shift's break, use the shift break
                const shiftBreak = calcShift?.breakTime ?? session.shiftBreakMinutes ?? 0;
                breakMinutesToUse = Math.max(calculatedBreaks.breakMinutes, shiftBreak);
            } else {
                // Fallback to shift break if no events
                breakMinutesToUse = calcShift?.breakTime ?? session.shiftBreakMinutes ?? 0;
            }
        }

        // Execute unified calculation
        const calculation = this.calculationService.calculate(
            {
                checkInTime: effectiveCheckIn,
                checkOutTime: effectiveCheckOut,
                shiftBreakMinutes: breakMinutesToUse
            },
            calcShift,
            leaves
        );

        // Populate updateData with results
        // Status flags are ALWAYS recalculated on the server to ensure consistency
        updateData.isLate = calculation.isLate;
        updateData.isEarlyLeave = calculation.isEarlyLeave;
        updateData.isOnLeave = calculation.isOnLeave;
        updateData.isHalfDay = calculation.isHalfDay;
        updateData.hasShortLeave = calculation.hasShortLeave;

        // Recalculate Work Day Status (e.g. if session moved to weekend)
        updateData.workDayStatus = this.calculationService.determineWorkDayStatus(effectiveDate, policySettings);

        // Times are updated based on calculation, but respect manual overrides for work/break/overtime if provided
        updateData.totalMinutes = calculation.totalMinutes;
        updateData.workMinutes = dto.workMinutes !== undefined ? dto.workMinutes : calculation.workMinutes;

        // Apply break override logic: if override is active, use DTO value; otherwise use calculated value
        if (effectiveBreakOverride) {
            updateData.breakMinutes = dto.breakMinutes ?? session.breakMinutes ?? calculation.breakMinutes;
        } else {
            updateData.breakMinutes = calculation.breakMinutes;
        }

        updateData.overtimeMinutes = dto.overtimeMinutes !== undefined ? dto.overtimeMinutes : calculation.overtimeMinutes;

        // Update shift snapshot if shiftId was changed
        if (dto.shiftId !== undefined) {
            if (dto.shiftId === null || dto.shiftId === "none") {
                updateData.shiftName = null;
                updateData.shiftStartTime = null;
                updateData.shiftEndTime = null;
                updateData.shiftBreakMinutes = null;
                updateData.shiftId = null;
            } else if (calcShift) {
                updateData.shiftName = calcShift.name;
                updateData.shiftStartTime = calcShift.startTime;
                updateData.shiftEndTime = calcShift.endTime;
                updateData.shiftBreakMinutes = calcShift.breakTime;
            }
        }
        // --- Centralized Calculation End ---

        // Re-evaluate Holidays (Centralized)
        const holidayResults = await this.calculationService.resolveHolidays(
            effectiveDate,
            workCalendarId,
            payrollCalendarId
        );
        updateData.workHolidayId = holidayResults.workHolidayId;
        updateData.payrollHolidayId = holidayResults.payrollHolidayId;

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

    async createManualSession(dto: CreateSessionDto): Promise<AttendanceSession> {
        const { employeeId, date, shiftId } = dto;
        const sessionDate = new Date(date);
        sessionDate.setUTCHours(0, 0, 0, 0);

        // Check if session exists
        const existing = await this.prisma.attendanceSession.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date: sessionDate,
                },
            },
        });

        if (existing) {
            throw new BadRequestException('Session already exists for this date');
        }

        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true },
        });

        if (!employee) throw new NotFoundException('Employee not found');

        // Create the session
        const session = await this.prisma.attendanceSession.create({
            data: {
                employeeId,
                companyId: employee.companyId,
                date: sessionDate,
                shiftId,
                manuallyEdited: true, // Mark as manual since it was empty
                inApprovalStatus: 'APPROVED',
                outApprovalStatus: 'APPROVED',
            },
        });

        // Trigger processing to fill in shift snapshots and link any existing events
        await this.processingService.processEmployeeDate(employeeId, sessionDate);

        return this.prisma.attendanceSession.findUniqueOrThrow({ where: { id: session.id } });
    }

    /**
     * Link an event to a specific session manually
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

    /**
     * Link an event to a specific session manually
     */
    async linkEventToSession(eventId: string, sessionId: string): Promise<void> {
        const event = await this.prisma.attendanceEvent.findUnique({
            where: { id: eventId },
        });

        if (!event) throw new NotFoundException('Event not found');

        const session = await this.prisma.attendanceSession.findUnique({
            where: { id: sessionId },
        });

        if (!session) throw new NotFoundException('Session not found');

        // Link event
        await this.prisma.attendanceEvent.update({
            where: { id: eventId },
            data: { sessionId },
        });

        // Trigger recalculation for the session
        await this.processingService.processEmployeeDate(session.employeeId, session.date);
    }

    /**
     * Unlink an event from its session
     */
    async unlinkEventFromSession(eventId: string): Promise<void> {
        const event = await this.prisma.attendanceEvent.findUnique({
            where: { id: eventId },
            include: { session: true },
        });

        if (!event) throw new NotFoundException('Event not found');

        const oldSession = event.session;

        // Unlink event
        await this.prisma.attendanceEvent.update({
            where: { id: eventId },
            data: { sessionId: null },
        });

        // Re-process the date to ensure the session reflects the missing event
        if (oldSession) {
            await this.processingService.processEmployeeDate(oldSession.employeeId, oldSession.date);
        }
    }
}
