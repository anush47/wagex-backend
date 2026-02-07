import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShiftSelectionService } from './shift-selection.service';
import { AttendanceCalculationService } from './attendance-calculation.service';
import { LeaveIntegrationService } from './leave-integration.service';
import { AttendanceEvent, AttendanceSession, EventSource, ApprovalStatus, SessionWorkDayStatus } from '@prisma/client';
import { PoliciesService } from '../../policies/policies.service';
import { ApprovalPolicyMode } from '../../policies/dto/attendance-policy.dto';

@Injectable()
export class AttendanceProcessingService {
    private readonly logger = new Logger(AttendanceProcessingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly shiftService: ShiftSelectionService,
        private readonly calculationService: AttendanceCalculationService,
        private readonly leaveService: LeaveIntegrationService,
        private readonly policiesService: PoliciesService,
    ) { }

    /**
     * Process events for a specific employee and date
     * This is called automatically when events are inserted
     */
    async processEmployeeDate(
        employeeId: string,
        date: Date,
    ): Promise<AttendanceSession | null> {
        this.logger.log(
            `Processing attendance for employee ${employeeId} on ${date.toISOString()}`,
        );

        // Normalize date to start of day
        const sessionDate = new Date(date);
        sessionDate.setHours(0, 0, 0, 0);

        // 1. Fetch all ACTIVE events for this employee on this date
        const events = await this.getEventsForDate(employeeId, sessionDate);

        if (events.length === 0) {
            this.logger.warn(
                `No events found for employee ${employeeId} on ${sessionDate.toISOString()}`,
            );
            // No events = no session (absence tracking is separate)
            return null;
        }

        // 2. Get shift (centralized)
        const shift = await this.shiftService.getEffectiveShift(
            employeeId,
            sessionDate,
            events[0]?.eventTime,
        );

        // 3. Get leaves (centralized)
        const leaves = await this.leaveService.getApprovedLeaves(
            employeeId,
            sessionDate,
        );

        // 4. Calculate everything (centralized)
        const firstIn = events.find((e) => e.eventType === 'IN');
        const lastOut = events
            .slice()
            .reverse()
            .find((e) => e.eventType === 'OUT');

        const times = this.calculationService.calculateWorkTime(events, shift);
        const flags = this.calculationService.calculateStatusFlags(
            firstIn?.eventTime || null,
            lastOut?.eventTime || null,
            shift,
            leaves,
        );

        // 5. Create or update session
        return this.createOrUpdateSession(
            employeeId,
            sessionDate,
            events,
            shift,
            times,
            flags,
        );
    }

    /**
     * Get all ACTIVE events for employee on a specific date
     */
    private async getEventsForDate(
        employeeId: string,
        date: Date,
    ): Promise<AttendanceEvent[]> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return this.prisma.attendanceEvent.findMany({
            where: {
                employeeId,
                eventTime: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                status: 'ACTIVE',
            },
            orderBy: {
                eventTime: 'asc',
            },
        });
    }

    /**
     * Create or update attendance session
     */
    private async createOrUpdateSession(
        employeeId: string,
        date: Date,
        events: AttendanceEvent[],
        shift: any,
        times: any,
        flags: any,
    ): Promise<AttendanceSession> {
        const firstIn = events.find((e) => e.eventType === 'IN');
        const lastOut = events
            .slice()
            .reverse()
            .find((e) => e.eventType === 'OUT');

        // Get employee's company
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true },
        });

        if (!employee) {
            throw new Error('Employee not found');
        }

        // 6. Determine Approval Status based on Policy
        const policy = await this.policiesService.getEffectivePolicy(employeeId);
        const approvalConfig = policy?.attendance?.approvalPolicy;

        // Check if session exists and was manually edited
        const existingSession = await this.prisma.attendanceSession.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date,
                },
            },
        });

        if (existingSession?.manuallyEdited) {
            this.logger.log(`Session for ${employeeId} on ${date.toISOString()} was manually edited, skipping auto-processing`);
            return existingSession;
        }

        const determineApproval = (event?: AttendanceEvent, isLate?: boolean) => {
            if (!event) return ApprovalStatus.APPROVED; // No event = effectively approved/empty

            if (!approvalConfig) return ApprovalStatus.APPROVED;

            // Mode: AUTO_APPROVE (Permissive, applies to manual too by default if that's what user wants)
            if (approvalConfig.mode === 'AUTO_APPROVE') {
                return ApprovalStatus.APPROVED;
            }

            // Manual entries REQUIRE approval unless in AUTO_APPROVE mode
            if (event.source === 'MANUAL') return ApprovalStatus.PENDING;

            switch (approvalConfig.mode) {
                case ApprovalPolicyMode.REQUIRE_APPROVAL_ALL:
                    return ApprovalStatus.PENDING;
                case ApprovalPolicyMode.REQUIRE_APPROVAL_EXCEPTIONS:
                    // Check triggers
                    if (isLate && (approvalConfig.exceptionTriggers?.deviceMismatch || approvalConfig.exceptionTriggers?.outsideZone)) {
                        return ApprovalStatus.PENDING;
                    }
                    return ApprovalStatus.APPROVED;
                default:
                    return ApprovalStatus.APPROVED;
            }
        };

        const inApprovalStatus = determineApproval(firstIn, flags.isLate);
        const outApprovalStatus = determineApproval(lastOut, flags.isEarlyLeave);

        // 7. Determine Work Day Status from Policy
        const workingDaysConfig = policy?.workingDays;
        let workDayStatus: SessionWorkDayStatus = SessionWorkDayStatus.FULL;

        if (workingDaysConfig?.defaultPattern) {
            const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const dayOfWeek = dayNames[date.getDay()];
            const dayConfig = (workingDaysConfig.defaultPattern as any)[dayOfWeek];

            if (dayConfig) {
                if (dayConfig.type === 'OFF') {
                    workDayStatus = SessionWorkDayStatus.OFF;
                } else if (dayConfig.type === 'HALF') {
                    workDayStatus = dayConfig.halfDayShift === 'LAST'
                        ? SessionWorkDayStatus.HALF_LAST
                        : SessionWorkDayStatus.HALF_FIRST;
                }
            }
        }

        const sessionData = {
            employeeId,
            companyId: employee.companyId,
            date,
            // Shift snapshot
            shiftId: shift?.id || null,
            shiftName: shift?.name || null,
            shiftStartTime: shift?.startTime || null,
            shiftEndTime: shift?.endTime || null,
            shiftBreakMinutes: shift?.breakMinutes || null,
            // Times
            checkInTime: firstIn?.eventTime || null,
            checkOutTime: lastOut?.eventTime || null,
            // Location snapshots
            checkInLocation: firstIn?.location || null,
            checkInLatitude: firstIn?.latitude || null,
            checkInLongitude: firstIn?.longitude || null,
            checkOutLocation: lastOut?.location || null,
            checkOutLatitude: lastOut?.latitude || null,
            checkOutLongitude: lastOut?.longitude || null,
            // Calculations
            totalMinutes: times.totalMinutes,
            breakMinutes: times.breakMinutes,
            workMinutes: times.workMinutes,
            overtimeMinutes: times.overtimeMinutes,
            // Status flags
            isLate: flags.isLate,
            isEarlyLeave: flags.isEarlyLeave,
            isOnLeave: flags.isOnLeave,
            isHalfDay: flags.isHalfDay,
            hasShortLeave: flags.hasShortLeave,
            // Additional flags
            manuallyEdited: false,
            autoCheckout: false,
            // Work Day Status
            workDayStatus,
            // Approval
            inApprovalStatus,
            outApprovalStatus,
        };

        // Upsert session
        const session = await this.prisma.attendanceSession.upsert({
            where: {
                employeeId_date: {
                    employeeId,
                    date,
                },
            },
            create: sessionData,
            update: {
                ...sessionData,
                // DO NOT overwrite manual approval if it was already set?
                // For now, we overwrite unless the session was "manuallyEdited"
                // but we might want to check existing session status.
            },
        });

        // Link events to session
        await this.prisma.attendanceEvent.updateMany({
            where: {
                id: {
                    in: events.map((e) => e.id),
                },
            },
            data: {
                sessionId: session.id,
            },
        });

        this.logger.log(`Session ${session.id} created/updated successfully`);
        return session;
    }

    /**
     * Process events for a date range
     * Useful for bulk processing or recalculation
     */
    async processDateRange(
        companyId: string,
        startDate: Date,
        endDate: Date,
    ): Promise<void> {
        this.logger.log(
            `Processing attendance for company ${companyId} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
        );

        // Get all employees in company
        const employees = await this.prisma.employee.findMany({
            where: { companyId },
            select: { id: true },
        });

        // Process each employee for each date
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            for (const employee of employees) {
                await this.processEmployeeDate(employee.id, new Date(currentDate));
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        this.logger.log('Bulk processing completed');
    }
}
