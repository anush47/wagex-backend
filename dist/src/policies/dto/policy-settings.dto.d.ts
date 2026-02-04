export declare enum ShiftSelectionPolicy {
    FIXED = "FIXED",
    CLOSEST_START_TIME = "CLOSEST_START_TIME",
    MANUAL = "MANUAL",
    EMPLOYEE_ROSTER = "EMPLOYEE_ROSTER"
}
export declare enum PayrollComponentType {
    FLAT_AMOUNT = "FLAT_AMOUNT",
    PERCENTAGE_BASIC = "PERCENTAGE_BASIC",
    PERCENTAGE_GROSS = "PERCENTAGE_GROSS"
}
export declare enum PayrollComponentCategory {
    ADDITION = "ADDITION",
    DEDUCTION = "DEDUCTION"
}
export declare class ShiftDto {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    minStartTime?: string;
    maxOutTime?: string;
    breakTime?: number;
    gracePeriodLate?: number;
    gracePeriodEarly?: number;
    useShiftStartAsClockIn?: boolean;
    autoClockOut?: boolean;
}
export declare class ShiftsConfigDto {
    list?: ShiftDto[];
    defaultShiftId?: string;
    selectionPolicy?: ShiftSelectionPolicy;
}
export declare class PayrollComponentDto {
    id: string;
    name: string;
    category: PayrollComponentCategory;
    type: PayrollComponentType;
    value: number;
    isStatutory?: boolean;
    affectsTotalEarnings?: boolean;
    minCap?: number;
    maxCap?: number;
}
export declare class SalaryComponentsConfigDto {
    components?: PayrollComponentDto[];
}
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
}
export declare enum WorkDayType {
    FULL = "FULL",
    HALF = "HALF",
    OFF = "OFF"
}
export declare enum HalfDayShift {
    FIRST = "FIRST",
    LAST = "LAST"
}
export declare class DailyWorkConfigDto {
    type: WorkDayType;
    halfDayShift?: HalfDayShift;
}
export declare enum GeofencingEnforcement {
    STRICT = "STRICT",
    FLAG_ONLY = "FLAG_ONLY",
    NONE = "NONE"
}
export declare enum ApprovalPolicyMode {
    AUTO_APPROVE = "AUTO_APPROVE",
    REQUIRE_APPROVAL_ALL = "REQUIRE_APPROVAL_ALL",
    REQUIRE_APPROVAL_EXCEPTIONS = "REQUIRE_APPROVAL_EXCEPTIONS"
}
export declare class GeoZoneDto {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
    address: string;
}
export declare class GeofencingConfigDto {
    enabled: boolean;
    enforcement: GeofencingEnforcement;
    zones: GeoZoneDto[];
}
export declare class ExceptionTriggersDto {
    outsideZone: boolean;
    deviceMismatch: boolean;
    unrecognizedIp?: boolean;
}
export declare class ApprovalPolicyConfigDto {
    mode: ApprovalPolicyMode;
    exceptionTriggers: ExceptionTriggersDto;
}
export declare class CompanyApiKeyDto {
    id: string;
    name: string;
    key: string;
    createdAt: string;
    lastUsedAt?: string;
}
export declare class AttendanceConfigDto {
    allowSelfCheckIn: boolean;
    requireLocation: boolean;
    requireDeviceInfo: boolean;
    geofencing: GeofencingConfigDto;
    approvalPolicy: ApprovalPolicyConfigDto;
    apiKeys: CompanyApiKeyDto[];
}
export declare enum CalendarType {
    SL_DEFAULT = "sl_default"
}
export declare class WorkingDaysConfigDto {
    defaultPattern?: Record<string, DailyWorkConfigDto>;
    isDynamic?: boolean;
    workingCalendar?: CalendarType;
    payrollCalendar?: CalendarType;
}
export declare class PolicySettingsDto {
    shifts?: ShiftsConfigDto;
    attendance?: AttendanceConfigDto;
    salaryComponents?: SalaryComponentsConfigDto;
    payrollConfiguration?: PayrollSettingsConfigDto;
    workingDays?: WorkingDaysConfigDto;
}
