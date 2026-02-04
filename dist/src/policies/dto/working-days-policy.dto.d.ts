export declare enum WorkDayType {
    FULL = "FULL",
    HALF = "HALF",
    OFF = "OFF"
}
export declare enum HalfDayShift {
    FIRST = "FIRST",
    LAST = "LAST"
}
export declare enum CalendarType {
    SL_DEFAULT = "sl_default"
}
export declare class DailyWorkConfigDto {
    type: WorkDayType;
    halfDayShift?: HalfDayShift;
}
export declare class WorkingDaysConfigDto {
    defaultPattern?: Record<string, DailyWorkConfigDto>;
    isDynamic?: boolean;
    workingCalendar?: CalendarType;
    payrollCalendar?: CalendarType;
}
