export declare class UpdateSessionDto {
    checkInTime?: string;
    checkOutTime?: string;
    shiftId?: string;
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
}
