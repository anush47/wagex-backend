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
export declare class WorkingDaysConfigDto {
    defaultPattern?: Record<string, DailyWorkConfigDto>;
    isDynamic?: boolean;
    workingCalendar?: string;
    payrollCalendar?: string;
}
