import { Injectable, Logger } from '@nestjs/common';
import { AttendanceEvent, SessionWorkDayStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionGroup } from './session-grouping.service';

import { ShiftDto } from '../../policies/dto/shifts-policy.dto';

interface LeaveRequest {
    id: string;
    type: string;
    startDate: Date;
    endDate: Date;
    days: number;
    minutes?: number;
}

interface WorkTimeResult {
    totalMinutes: number;
    breakMinutes: number;
    workMinutes: number;
    overtimeMinutes: number;
}

interface StatusFlags {
    isLate: boolean;
    isEarlyLeave: boolean;
    isOnLeave: boolean;
    isHalfDay: boolean;
    hasShortLeave: boolean;
}

export interface AttendanceCalculationResult extends WorkTimeResult, StatusFlags { }

@Injectable()
export class AttendanceCalculationService {
    private readonly logger = new Logger(AttendanceCalculationService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Centralized calculation function for both auto and manual attendance
     */
    calculate(
        data: {
            events?: AttendanceEvent[];
            sessionGroup?: SessionGroup;
            checkInTime?: Date | null;
            checkOutTime?: Date | null;
            shiftBreakMinutes?: number | null;
        },
        shift: ShiftDto | null,
        leaves: LeaveRequest[] = [],
    ): AttendanceCalculationResult {
        let workTime: WorkTimeResult;

        if (data.sessionGroup) {
            // Session group-based calculation (Enhanced with multiple IN/OUT pairs)
            workTime = this.calculateWorkTimeFromSessionGroup(data.sessionGroup, shift);
        } else if (data.events && data.events.length > 0) {
            // Event-based calculation (Auto)
            workTime = this.calculateWorkTime(data.events, shift);
        } else {
            // Explicit time-based calculation (Manual)
            workTime = this.calculateManualWorkTime(
                data.checkInTime || null,
                data.checkOutTime || null,
                data.shiftBreakMinutes ?? shift?.breakTime ?? 0,
                shift
            );
        }

        // Determine check-in and check-out times for status flags
        let checkInTime: Date | null = null;
        let checkOutTime: Date | null = null;

        if (data.sessionGroup) {
            checkInTime = data.sessionGroup.firstIn;
            checkOutTime = data.sessionGroup.lastOut;
        } else {
            checkInTime = data.checkInTime || (data.events ? this.getFirstIn(data.events) : null);
            checkOutTime = data.checkOutTime || (data.events ? this.getLastOut(data.events) : null);
        }

        const flags = this.calculateStatusFlags(
            checkInTime,
            checkOutTime,
            shift,
            leaves
        );

        return {
            ...workTime,
            ...flags,
        };
    }

    private getFirstIn(events: AttendanceEvent[]): Date | null {
        return events.find(e => e.eventType === 'IN')?.eventTime || null;
    }

    private getLastOut(events: AttendanceEvent[]): Date | null {
        return [...events].reverse().find(e => e.eventType === 'OUT')?.eventTime || null;
    }

    /**
     * Calculate work time from explicit check-in/out times
     */
    calculateManualWorkTime(
        checkIn: Date | null,
        checkOut: Date | null,
        breakMinutes: number,
        shift: ShiftDto | null,
    ): WorkTimeResult {
        if (!checkIn || !checkOut) {
            return {
                totalMinutes: 0,
                breakMinutes: 0,
                workMinutes: 0,
                overtimeMinutes: 0,
            };
        }

        const totalMinutes = Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60)));
        const workMinutes = Math.max(0, totalMinutes - breakMinutes);

        let overtimeMinutes = 0;
        if (shift) {
            const shiftDurationMinutes = this.getShiftDurationMinutes(shift);
            overtimeMinutes = Math.max(0, workMinutes - shiftDurationMinutes);
        }

        return {
            totalMinutes,
            breakMinutes,
            workMinutes,
            overtimeMinutes,
        };
    }

    /**
     * Calculate work time from multiple IN/OUT pairs
     * Handles breaks automatically by calculating gaps between OUT and IN
     */
    calculateWorkTime(
        events: AttendanceEvent[],
        shift: ShiftDto | null,
    ): WorkTimeResult {
        if (!events || events.length === 0) {
            return {
                totalMinutes: 0,
                breakMinutes: 0,
                workMinutes: 0,
                overtimeMinutes: 0,
            };
        }

        // Sort events by time
        const sortedEvents = [...events].sort(
            (a, b) => a.eventTime.getTime() - b.eventTime.getTime(),
        );

        // Calculate breaks from multiple IN/OUT pairs
        const { totalMinutes, breakMinutes: calculatedBreakMinutes } =
            this.calculateBreaksFromEvents(sortedEvents);

        // Apply automatic break if total time > 6 hours and no break calculated yet
        let breakMinutes = calculatedBreakMinutes;
        if (breakMinutes === 0 && totalMinutes > 360 && shift?.breakTime) {
            breakMinutes = shift.breakTime;
        }

        // Work minutes = total - breaks
        const workMinutes = Math.max(0, totalMinutes - breakMinutes);

        // Calculate overtime if shift is defined
        let overtimeMinutes = 0;
        if (shift) {
            const shiftDurationMinutes = this.getShiftDurationMinutes(shift);
            overtimeMinutes = Math.max(0, workMinutes - shiftDurationMinutes);
        }

        return {
            totalMinutes,
            breakMinutes,
            workMinutes,
            overtimeMinutes,
        };
    }

    /**
     * Calculate work time from session group data (enhanced for multiple IN/OUT pairs)
     */
    calculateWorkTimeFromSessionGroup(
        sessionGroup: SessionGroup,
        shift: ShiftDto | null,
    ): WorkTimeResult {
        if (!sessionGroup.events || sessionGroup.events.length === 0) {
            return {
                totalMinutes: 0,
                breakMinutes: 0,
                workMinutes: 0,
                overtimeMinutes: 0,
            };
        }

        // Calculate total time from first IN to last OUT
        if (!sessionGroup.firstIn || !sessionGroup.lastOut) {
            return {
                totalMinutes: 0,
                breakMinutes: 0,
                workMinutes: 0,
                overtimeMinutes: 0,
            };
        }

        const totalMinutes = Math.max(0, Math.floor((sessionGroup.lastOut.getTime() - sessionGroup.firstIn.getTime()) / (1000 * 60)));

        // Calculate breaks from additional IN/OUT pairs
        let breakMinutes = 0;
        for (const pair of sessionGroup.additionalInOutPairs) {
            const pairBreak = Math.floor((pair.out.getTime() - pair.in.getTime()) / (1000 * 60));
            breakMinutes += pairBreak;
        }

        // Apply shift break if no additional breaks were calculated and shift has break time
        if (breakMinutes === 0 && shift?.breakTime && totalMinutes > 360) {
            breakMinutes = shift.breakTime;
        }

        // Work minutes = total - breaks
        const workMinutes = Math.max(0, totalMinutes - breakMinutes);

        // Calculate overtime if shift is defined
        let overtimeMinutes = 0;
        if (shift) {
            const shiftDurationMinutes = this.getShiftDurationMinutes(shift);
            overtimeMinutes = Math.max(0, workMinutes - shiftDurationMinutes);
        }

        return {
            totalMinutes,
            breakMinutes,
            workMinutes,
            overtimeMinutes,
        };
    }

    /**
     * Calculate breaks from multiple IN/OUT event pairs
     * Example: IN 9:00, OUT 12:00, IN 13:00, OUT 17:00 = 1hr break
     */
    calculateBreaksFromEvents(events: AttendanceEvent[]): {
        totalMinutes: number;
        breakMinutes: number;
        pairs: Array<{ in: Date; out: Date }>;
    } {
        const pairs: Array<{ in: Date; out: Date }> = [];
        let totalMinutes = 0;
        let breakMinutes = 0;

        let lastOut: Date | null = null;

        for (let i = 0; i < events.length; i++) {
            const event = events[i];

            if (event.eventType === 'IN') {
                // If we have a previous OUT, calculate break time
                if (lastOut) {
                    const breakDuration =
                        (event.eventTime.getTime() - lastOut.getTime()) / (1000 * 60);
                    breakMinutes += breakDuration;
                }

                // Look for matching OUT
                const nextOut = events
                    .slice(i + 1)
                    .find((e) => e.eventType === 'OUT');
                if (nextOut) {
                    pairs.push({ in: event.eventTime, out: nextOut.eventTime });
                    const duration =
                        (nextOut.eventTime.getTime() - event.eventTime.getTime()) /
                        (1000 * 60);
                    totalMinutes += duration;
                    lastOut = nextOut.eventTime;
                }
            }
        }

        return { totalMinutes, breakMinutes, pairs };
    }

    /**
     * Calculate status flags based on times and shift rules
     */
    calculateStatusFlags(
        checkInTime: Date | null,
        checkOutTime: Date | null,
        shift: ShiftDto | null,
        leaves: LeaveRequest[],
    ): StatusFlags {
        const flags: StatusFlags = {
            isLate: false,
            isEarlyLeave: false,
            isOnLeave: false,
            isHalfDay: false,
            hasShortLeave: false,
        };

        // Check leave status
        if (leaves.length > 0) {
            flags.isOnLeave = leaves.some((l) => l.type === 'FULL_DAY');
            flags.isHalfDay = leaves.some(
                (l) => l.type === 'HALF_DAY_FIRST' || l.type === 'HALF_DAY_LAST',
            );
            flags.hasShortLeave = leaves.some((l) => l.type === 'SHORT_LEAVE');
        }

        // If no shift or no check-in, can't determine late/early
        if (!shift || !checkInTime) {
            return flags;
        }

        const graceMinutes = shift.gracePeriodLate || 0;

        // Check if late
        const shiftStartTime = this.parseTimeString(shift.startTime, checkInTime);
        const lateThreshold = new Date(
            shiftStartTime.getTime() + graceMinutes * 60 * 1000,
        );
        flags.isLate = checkInTime > lateThreshold;

        // Check if early leave
        if (checkOutTime) {
            const shiftEndTime = this.parseTimeString(shift.endTime, checkOutTime);
            const earlyThreshold = new Date(
                shiftEndTime.getTime() - graceMinutes * 60 * 1000,
            );
            flags.isEarlyLeave = checkOutTime < earlyThreshold;
        }

        return flags;
    }

    /**
     * Determine if auto-checkout should apply
     */
    shouldAutoCheckout(
        events: AttendanceEvent[],
        shift: ShiftDto | null,
        currentTime: Date,
    ): boolean {
        if (!shift || !shift.autoClockOut) {
            return false;
        }

        // Check if there's a single IN event without OUT
        const hasIn = events.some((e) => e.eventType === 'IN');
        const hasOut = events.some((e) => e.eventType === 'OUT');

        if (!hasIn || hasOut) {
            return false;
        }

        // Check if more than 12 hours have passed since check-in
        const firstIn = events.find((e) => e.eventType === 'IN');
        if (!firstIn) {
            return false;
        }

        const hoursSinceCheckIn =
            (currentTime.getTime() - firstIn.eventTime.getTime()) / (1000 * 60 * 60);

        return hoursSinceCheckIn > 12;
    }

    /**
     * Calculate auto-checkout time based on shift duration
     */
    calculateAutoCheckoutTime(checkInTime: Date, shift: ShiftDto): Date {
        const shiftDurationMinutes = this.getShiftDurationMinutes(shift);
        return new Date(
            checkInTime.getTime() + shiftDurationMinutes * 60 * 1000,
        );
    }

    /**
     * Determine Work Day Status from policy pattern
     */
    determineWorkDayStatus(date: Date, policy: any): SessionWorkDayStatus {
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
        return workDayStatus;
    }

    /**
     * Resolve holidays for a specific date and calendars
     */
    async resolveHolidays(
        date: Date,
        workCalendarId?: string | null,
        payrollCalendarId?: string | null,
    ): Promise<{ workHolidayId: string | null; payrollHolidayId: string | null }> {
        let workHolidayId: string | null = null;
        let payrollHolidayId: string | null = null;

        if (!workCalendarId && !payrollCalendarId) {
            return { workHolidayId, payrollHolidayId };
        }

        if (workCalendarId === payrollCalendarId && workCalendarId) {
            const holiday = await this.findHoliday(date, workCalendarId, 'JOINT');
            if (holiday) {
                workHolidayId = holiday.id;
                payrollHolidayId = holiday.id;
            }
        } else {
            const [workHoliday, payrollHoliday] = await Promise.all([
                workCalendarId ? this.findHoliday(date, workCalendarId, 'WORK') : Promise.resolve(null),
                payrollCalendarId ? this.findHoliday(date, payrollCalendarId, 'PAYROLL') : Promise.resolve(null),
            ]);

            if (workHoliday) workHolidayId = workHoliday.id;
            if (payrollHoliday) payrollHolidayId = payrollHoliday.id;
        }

        return { workHolidayId, payrollHolidayId };
    }

    private async findHoliday(date: Date, calendarId: string, type: string) {
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
            this.logger.log(`[ATTENDANCE_LOGIC] ✅ Found ${type} Holiday: ${holiday.name} on ${date.toISOString().split('T')[0]}`);
        } else {
            this.logger.log(`[ATTENDANCE_LOGIC] ❌ No ${type} Holiday on ${date.toISOString().split('T')[0]} in calendar ${calendarId}`);
        }
        return holiday;
    }

    /**
     * Get shift duration in minutes
     */
    private getShiftDurationMinutes(shift: ShiftDto): number {
        const start = this.parseTimeString(shift.startTime, new Date());
        const end = this.parseTimeString(shift.endTime, new Date());

        let duration = (end.getTime() - start.getTime()) / (1000 * 60);

        // Handle overnight shifts
        if (duration < 0) {
            duration += 24 * 60;
        }

        return duration;
    }

    /**
     * Parse time string (HH:mm) to Date object
     */
    private parseTimeString(timeStr: string, referenceDate: Date): Date {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date(referenceDate);
        date.setHours(hours, minutes, 0, 0);
        return date;
    }
}
