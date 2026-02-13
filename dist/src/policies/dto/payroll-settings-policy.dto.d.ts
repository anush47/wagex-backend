export declare enum PayCycleFrequency {
    MONTHLY = "MONTHLY",
    SEMI_MONTHLY = "SEMI_MONTHLY",
    BI_WEEKLY = "BI_WEEKLY",
    WEEKLY = "WEEKLY",
    DAILY = "DAILY"
}
export declare enum PayrollCalculationMethod {
    HOURLY_ATTENDANCE_WITH_OT = "HOURLY_ATTENDANCE_WITH_OT",
    SHIFT_ATTENDANCE_WITH_OT = "SHIFT_ATTENDANCE_WITH_OT",
    SHIFT_ATTENDANCE_FLAT = "SHIFT_ATTENDANCE_FLAT",
    DAILY_ATTENDANCE_FLAT = "DAILY_ATTENDANCE_FLAT",
    FIXED_MONTHLY_SALARY = "FIXED_MONTHLY_SALARY"
}
export declare enum UnpaidLeaveAction {
    DEDUCT_FROM_TOTAL = "DEDUCT_FROM_TOTAL",
    ADD_AS_DEDUCTION = "ADD_AS_DEDUCTION"
}
export declare enum LateDeductionType {
    DIVISOR_BASED = "DIVISOR_BASED",
    FIXED_AMOUNT = "FIXED_AMOUNT"
}
export declare enum OvertimeCalculationMethod {
    BASIC_DIVISOR = "BASIC_DIVISOR",
    GROSS_DIVISOR = "GROSS_DIVISOR",
    FIXED_HOURLY = "FIXED_HOURLY"
}
export declare class PayrollSettingsConfigDto {
    frequency: PayCycleFrequency;
    runDay: string;
    runDayAnchor?: string;
    cutoffDaysBeforePayDay: number;
    calculationMethod: PayrollCalculationMethod;
    baseRateDivisor: number;
    autoDeductUnpaidLeaves: boolean;
    unpaidLeaveAction: UnpaidLeaveAction;
    lateDeductionType: LateDeductionType;
    lateDeductionValue: number;
    otCalculationMethod?: OvertimeCalculationMethod;
    otDivisor?: number;
    otNormalRate?: number;
    otDoubleRate?: number;
    otTripleRate?: number;
    calendarId?: string;
}
