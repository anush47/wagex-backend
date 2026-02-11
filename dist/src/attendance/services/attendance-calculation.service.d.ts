import { AttendanceEvent, SessionWorkDayStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionGroup } from './session-grouping.service';
interface ShiftDto {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakTime: number;
    gracePeriodLate?: number;
    autoClockOut?: boolean;
}
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
export interface AttendanceCalculationResult extends WorkTimeResult, StatusFlags {
}
export declare class AttendanceCalculationService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    calculate(data: {
        events?: AttendanceEvent[];
        sessionGroup?: SessionGroup;
        checkInTime?: Date | null;
        checkOutTime?: Date | null;
        shiftBreakMinutes?: number | null;
    }, shift: ShiftDto | null, leaves?: LeaveRequest[]): AttendanceCalculationResult;
    private getFirstIn;
    private getLastOut;
    calculateManualWorkTime(checkIn: Date | null, checkOut: Date | null, breakMinutes: number, shift: ShiftDto | null): WorkTimeResult;
    calculateWorkTime(events: AttendanceEvent[], shift: ShiftDto | null): WorkTimeResult;
    calculateWorkTimeFromSessionGroup(sessionGroup: SessionGroup, shift: ShiftDto | null): WorkTimeResult;
    calculateBreaksFromEvents(events: AttendanceEvent[]): {
        totalMinutes: number;
        breakMinutes: number;
        pairs: Array<{
            in: Date;
            out: Date;
        }>;
    };
    calculateStatusFlags(checkInTime: Date | null, checkOutTime: Date | null, shift: ShiftDto | null, leaves: LeaveRequest[]): StatusFlags;
    shouldAutoCheckout(events: AttendanceEvent[], shift: ShiftDto | null, currentTime: Date): boolean;
    calculateAutoCheckoutTime(checkInTime: Date, shift: ShiftDto): Date;
    determineWorkDayStatus(date: Date, policy: any): SessionWorkDayStatus;
    resolveHolidays(date: Date, workCalendarId?: string | null, payrollCalendarId?: string | null): Promise<{
        workHolidayId: string | null;
        payrollHolidayId: string | null;
    }>;
    private findHoliday;
    private getShiftDurationMinutes;
    private parseTimeString;
}
export {};
