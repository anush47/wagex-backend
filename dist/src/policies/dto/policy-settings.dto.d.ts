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
export declare class PayrollConfigDto {
    components?: PayrollComponentDto[];
}
export declare class PolicySettingsDto {
    shifts?: ShiftsConfigDto;
    attendance?: any;
    payroll?: PayrollConfigDto;
}
