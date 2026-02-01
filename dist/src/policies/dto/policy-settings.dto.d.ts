export declare enum ShiftSelectionPolicy {
    FIXED = "FIXED",
    CLOSEST_START_TIME = "CLOSEST_START_TIME",
    ROSTER = "ROSTER",
    MANUAL = "MANUAL"
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
export declare class PolicySettingsDto {
    shifts?: ShiftsConfigDto;
    attendance?: any;
    payroll?: any;
}
