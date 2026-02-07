import { SessionWorkDayStatus, ApprovalStatus, EventStatus } from '@prisma/client';
export declare class UpdateSessionDto {
    inApprovalStatus?: ApprovalStatus;
    outApprovalStatus?: ApprovalStatus;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    shiftId?: string;
    workDayStatus?: SessionWorkDayStatus;
    isLate?: boolean;
    isEarlyLeave?: boolean;
    isOnLeave?: boolean;
    isHalfDay?: boolean;
    hasShortLeave?: boolean;
    remarks?: string;
    totalMinutes?: number;
    breakMinutes?: number;
    workMinutes?: number;
    overtimeMinutes?: number;
}
export declare class SessionQueryDto {
    companyId?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}
export declare class EventQueryDto {
    companyId?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    status?: EventStatus;
}
