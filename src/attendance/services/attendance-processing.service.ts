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

        // Normalize date to 'Logical Day' (UTC Midnight of the Local Day)
        const sessionDate = new Date(Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        ));

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
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

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
        const effectivePolicyData = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                policy: true, // Employee Override
                company: { include: { policy: true } } // Company Default
            }
        });

        const policySrc = effectivePolicyData?.policy ? 'EMPLOYEE_OVERRIDE' : 'COMPANY_DEFAULT';
        this.logger.log(`[ATTENDANCE_LOGIC] Policy Source for ${employeeId}: ${policySrc}`);

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

        // 8. Link Holidays (Work & Payroll)
        // Resolve IDs from policy or fall back to company default (stored in policy.calendarId potentially? 
        // actually policy object from getEffectivePolicy is PolicySettingsDto, so it has .calendarId)

        // The policy object returned by getEffectivePolicy is of type PolicySettingsDto
        // We need to cast it or ensuring it has the fields we expect from our DTO updates
        const policySettings = policy as any;

        // Use workingDays as primary source for calendars, then fall back
        const workCalendarId = policySettings.workingDays?.workingCalendar || policySettings.attendance?.calendarId || policySettings.calendarId;
        const payrollCalendarId = policySettings.workingDays?.payrollCalendar || policySettings.payrollConfiguration?.calendarId || policySettings.calendarId;

        // Fetch calendar names for cleaner logging
        const calendars = await this.prisma.calendar.findMany({
            where: { id: { in: [workCalendarId, payrollCalendarId].filter(id => !!id) } },
            select: { id: true, name: true }
        });
        const getCalName = (id: string | null) => calendars.find(c => c.id === id)?.name || 'NONE';

        this.logger.log(`[ATTENDANCE_LOGIC] --- Processing Session ---`);
        this.logger.log(`[ATTENDANCE_LOGIC] Employee: ${employeeId} | Date: ${date.toISOString().split('T')[0]}`);
        this.logger.log(`[ATTENDANCE_LOGIC] Work Calendar: ${getCalName(workCalendarId)} (${workCalendarId || 'MISSING'})`);
        this.logger.log(`[ATTENDANCE_LOGIC] Payroll Calendar: ${getCalName(payrollCalendarId)} (${payrollCalendarId || 'MISSING'})`);

        let workHolidayId: string | null = null;
        let payrollHolidayId: string | null = null;

        const findHoliday = async (calendarId: string, type: string) => {
            if (!calendarId) return null;

            const startOfDay = new Date(date);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setUTCHours(23, 59, 59, 999);

            const holiday = await this.prisma.holiday.findFirst({
                where: {
                    calendarId,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                },
                select: { id: true, name: true }
            });

            if (holiday) {
                this.logger.log(`[ATTENDANCE_LOGIC] ✅ Found ${type} Holiday: ${holiday.name} (Search Range UTC: ${startOfDay.toISOString()} to ${endOfDay.toISOString()})`);
            } else {
                this.logger.log(`[ATTENDANCE_LOGIC] ❌ No ${type} Holiday in ${getCalName(calendarId)}`);
            }
            return holiday;
        };

        if (workCalendarId || payrollCalendarId) {
            if (workCalendarId === payrollCalendarId && workCalendarId) {
                const holiday = await findHoliday(workCalendarId, 'JOINT');
                if (holiday) {
                    workHolidayId = holiday.id;
                    payrollHolidayId = holiday.id;
                }
            } else {
                const [workHoliday, payrollHoliday] = await Promise.all([
                    workCalendarId ? findHoliday(workCalendarId, 'WORK') : Promise.resolve(null),
                    payrollCalendarId ? findHoliday(payrollCalendarId, 'PAYROLL') : Promise.resolve(null),
                ]);

                if (workHoliday) workHolidayId = (workHoliday as any).id;
                if (payrollHoliday) payrollHolidayId = (payrollHoliday as any).id;
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
            // Linked Holidays
            workHolidayId,
            payrollHolidayId,
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
