import { Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { ShiftSelectionService } from './shift-selection.service';
import { AttendanceCalculationService } from './attendance-calculation.service';
import { LeaveIntegrationService } from './leave-integration.service';
import { AttendanceEvent, AttendanceSession, EventSource, ApprovalStatus, SessionWorkDayStatus } from '@prisma/client';
import { PoliciesService } from '../../policies/policies.service';
import { ApprovalPolicyMode } from '../../policies/dto/attendance-policy.dto';
import { SessionGroupingService, SessionGroup } from './session-grouping.service';
import { TimeService } from './time.service';

@Injectable()
export class AttendanceProcessingService {
    private readonly logger = new Logger(AttendanceProcessingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly shiftService: ShiftSelectionService,
        private readonly calculationService: AttendanceCalculationService,
        private readonly leaveService: LeaveIntegrationService,
        private readonly policiesService: PoliciesService,
        private readonly sessionGroupingService: SessionGroupingService,
        private readonly timeService: TimeService,
    ) { }

    /**
     * Process events for a specific employee and date
     * This is called automatically when events are inserted
     */
    async processEmployeeDate(
        employeeId: string,
        date: Date,
    ): Promise<AttendanceSession[]> {
        // Resolve timezone once for the employee
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: { company: true },
        });
        const timezone = employee?.company?.timezone || 'UTC';

        this.logger.log(
            `Processing attendance for employee ${employeeId} on ${date.toISOString()} in ${timezone}`,
        );

        // Get all events for this employee within the time window (24 hours before and after the reference date)
        const events = await this.sessionGroupingService.getEventsForSessionGrouping(employeeId, date, timezone);

        if (events.length === 0) {
            this.logger.warn(
                `No events found for employee ${employeeId} around ${date.toISOString()}`,
            );
            // No events = no sessions (absence tracking is separate)
            return [];
        }

        // Group events into logical sessions
        const sessionGroups = await this.sessionGroupingService.groupEventsIntoSessions(employeeId, events, date, timezone);

        if (sessionGroups.length === 0) {
            this.logger.warn(
                `No session groups created for employee ${employeeId} around ${date.toISOString()}`,
            );
            return [];
        }

        this.logger.log(`[PROCESSING] Found ${sessionGroups.length} session groups for ${employeeId}`);

        // Process each session group
        const sessions: AttendanceSession[] = [];
        for (const sessionGroup of sessionGroups) {
            // Get shift effective at the time of the first IN event in this group
            const shift = await this.shiftService.getEffectiveShift(
                employeeId,
                sessionGroup.firstIn || date,
                timezone,
            );

            // Get leaves for the session date
            const leaves = await this.leaveService.getApprovedLeaves(
                employeeId,
                sessionGroup.sessionDate,
            );

            // Calculate everything (centralized)
            const calculation = this.calculationService.calculate(
                { sessionGroup },
                shift,
                leaves,
                timezone
            );

            const times = calculation;
            const flags = calculation;

            // Create or update session
            const session = await this.createOrUpdateSessionFromGroup(
                employeeId,
                sessionGroup,
                shift,
                times,
                flags,
            );

            if (session) {
                sessions.push(session);
            }
        }

        return sessions;
    }


    /**
     * Create or update attendance session from session group
     */
    private async createOrUpdateSessionFromGroup(
        employeeId: string,
        sessionGroup: SessionGroup,
        shift: any,
        times: any,
        flags: any,
    ): Promise<AttendanceSession> {
        // Get employee's company
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true },
        });

        if (!employee) {
            throw new Error('Employee not found');
        }

        // Determine Approval Status based on Policy
        const detail = await this.policiesService.getEffectivePolicyDetail(employeeId);
        const policySrc = detail.source.hasAssignedPolicy ? 'ASSIGNED_TEMPLATE' : 'COMPANY_DEFAULT';
        this.logger.log(`[ATTENDANCE_LOGIC] Policy Source for ${employeeId}: ${policySrc} (${detail.source.assignedPolicyName || 'Default'})`);

        const effectivePolicy = detail.effective;
        const approvalConfig = effectivePolicy?.attendance?.approvalPolicy;

        const firstInEvent = sessionGroup.events.find((e) => e.eventType === 'IN');
        const lastOutEvent = sessionGroup.events
            .slice()
            .reverse()
            .find((e) => e.eventType === 'OUT');

        const determineApproval = (event?: AttendanceEvent, isLate?: boolean) => {
            if (!event) return ApprovalStatus.APPROVED;

            if (!approvalConfig) return ApprovalStatus.APPROVED;

            if (approvalConfig.mode === 'AUTO_APPROVE') {
                return ApprovalStatus.APPROVED;
            }

            if (event.source === 'MANUAL') return ApprovalStatus.PENDING;

            switch (approvalConfig.mode) {
                case ApprovalPolicyMode.REQUIRE_APPROVAL_ALL:
                    return ApprovalStatus.PENDING;
                case ApprovalPolicyMode.REQUIRE_APPROVAL_EXCEPTIONS:
                    if (isLate && (approvalConfig.exceptionTriggers?.deviceMismatch || approvalConfig.exceptionTriggers?.outsideZone)) {
                        return ApprovalStatus.PENDING;
                    }
                    return ApprovalStatus.APPROVED;
                default:
                    return ApprovalStatus.APPROVED;
            }
        };

        const inApprovalStatus = determineApproval(firstInEvent, flags.isLate);
        const outApprovalStatus = determineApproval(lastOutEvent, flags.isEarlyLeave);

        const workDayStatus = this.calculationService.determineWorkDayStatus(sessionGroup.sessionDate, effectivePolicy);

        const policySettings = effectivePolicy as any;
        const workCalendarId = policySettings.workingDays?.workingCalendar || policySettings.attendance?.calendarId || policySettings.calendarId;
        const payrollCalendarId = policySettings.workingDays?.payrollCalendar || policySettings.payrollConfiguration?.calendarId || policySettings.calendarId;

        const { workHolidayId, payrollHolidayId } = await this.calculationService.resolveHolidays(
            sessionGroup.sessionDate,
            workCalendarId,
            payrollCalendarId
        );

        const sessionData = {
            employeeId,
            companyId: employee.companyId,
            date: sessionGroup.sessionDate,
            shiftId: shift?.id || null,
            shiftName: shift?.name || null,
            shiftStartTime: shift?.startTime || null,
            shiftEndTime: shift?.endTime || null,
            shiftBreakMinutes: shift?.breakTime || null,
            checkInTime: sessionGroup.firstIn || null,
            checkOutTime: sessionGroup.lastOut || null,
            checkInLocation: firstInEvent?.location || null,
            checkInLatitude: firstInEvent?.latitude || null,
            checkInLongitude: firstInEvent?.longitude || null,
            checkOutLocation: lastOutEvent?.location || null,
            checkOutLatitude: lastOutEvent?.latitude || null,
            checkOutLongitude: lastOutEvent?.longitude || null,
            totalMinutes: times.totalMinutes,
            breakMinutes: times.breakMinutes,
            workMinutes: times.workMinutes,
            overtimeMinutes: times.overtimeMinutes,
            isLate: flags.isLate,
            isEarlyLeave: flags.isEarlyLeave,
            isOnLeave: flags.isOnLeave,
            isHalfDay: flags.isHalfDay,
            hasShortLeave: flags.hasShortLeave,
            manuallyEdited: false,
            autoCheckout: false,
            additionalInOutCount: sessionGroup.additionalInOutPairs.length,
            workDayStatus,
            inApprovalStatus,
            outApprovalStatus,
            workHolidayId,
            payrollHolidayId,
        };

        // Check if session exists (using the session date from the group)
        let session = await this.prisma.attendanceSession.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date: sessionGroup.sessionDate,
                },
            },
        });

        this.logger.log(`[SESSION_LOOKUP] Searching for ${employeeId} on ${sessionGroup.sessionDate.toISOString()}. Found: ${session ? session.id : 'NONE'}`);

        // Link events to the session if it exists (even if manually edited)
        if (session) {
            await this.prisma.attendanceEvent.updateMany({
                where: {
                    id: { in: sessionGroup.events.map((e) => e.id) },
                },
                data: { sessionId: session.id },
            });

            if (session.manuallyEdited) {
                this.logger.log(`[MERGE_MANUAL] Session ${session.id} is manuallyEdited. Merging logs into summary.`);

                // For manually edited sessions, we ONLY fill in missing times.
                // We do NOT overwrite existing manual times to preserve user edits.
                const manualUpdateData: any = {
                    ...sessionData,
                    checkInTime: session.checkInTime || sessionData.checkInTime,
                    checkOutTime: session.checkOutTime || sessionData.checkOutTime,
                    // Preserve status flags if they were manually set? 
                    // For now, we recalculate flags (late/early) based on the preserved times.
                };

                // Remove fields that should stay manual
                delete manualUpdateData.manuallyEdited;

                session = await this.prisma.attendanceSession.update({
                    where: { id: session.id },
                    data: {
                        ...manualUpdateData,
                        additionalInOutCount: sessionGroup.additionalInOutPairs.length,
                    }
                });

                return session;
            }
        }


        // Upsert session
        session = await this.prisma.attendanceSession.upsert({
            where: {
                employeeId_date: {
                    employeeId,
                    date: sessionGroup.sessionDate,
                },
            },
            create: sessionData,
            update: {
                ...sessionData,
            },
        });

        // Link events to session
        await this.prisma.attendanceEvent.updateMany({
            where: {
                id: {
                    in: sessionGroup.events.map((e) => e.id),
                },
            },
            data: {
                sessionId: session.id,
            },
        });

        this.logger.log(`Session ${session.id} created/updated successfully from ${sessionGroup.events.length} events`);
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
