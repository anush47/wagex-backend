import { AttendanceEvent } from '@prisma/client';
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
export declare class AttendanceCalculationService {
    private readonly logger;
    calculateWorkTime(events: AttendanceEvent[], shift: ShiftDto | null): WorkTimeResult;
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
    private getShiftDurationMinutes;
    private parseTimeString;
}
export {};
