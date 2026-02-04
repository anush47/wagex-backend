import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ShiftSelectionPolicy {
    FIXED = 'FIXED',
    CLOSEST_START_TIME = 'CLOSEST_START_TIME',
    MANUAL = 'MANUAL',
    EMPLOYEE_ROSTER = 'EMPLOYEE_ROSTER',
}

export enum PayrollComponentType {
    FLAT_AMOUNT = 'FLAT_AMOUNT',
    PERCENTAGE_BASIC = 'PERCENTAGE_BASIC',
    PERCENTAGE_GROSS = 'PERCENTAGE_GROSS',
}

export enum PayrollComponentCategory {
    ADDITION = 'ADDITION',
    DEDUCTION = 'DEDUCTION'
}

export class ShiftDto {
    @ApiProperty({ example: 'shift-1', description: 'Unique ID for the shift' })
    @IsString()
    id: string;

    @ApiProperty({ example: 'Standard Morning', description: 'Display name of the shift' })
    @IsString()
    name: string;

    @ApiProperty({ example: '08:00', description: 'Shift start time (HH:mm)' })
    @IsString()
    startTime: string;

    @ApiProperty({ example: '17:00', description: 'Shift end time (HH:mm)' })
    @IsString()
    endTime: string;

    @ApiPropertyOptional({ example: '07:30', description: 'Earliest allowed clock-in' })
    @IsOptional()
    @IsString()
    minStartTime?: string;

    @ApiPropertyOptional({ example: '19:00', description: 'Latest allowed clock-out' })
    @IsOptional()
    @IsString()
    maxOutTime?: string;

    @ApiPropertyOptional({ example: 60, description: 'Break duration in minutes' })
    @IsOptional()
    @IsNumber()
    breakTime?: number;

    @ApiPropertyOptional({ example: 15, description: 'Minutes allowed after startTime before marked late' })
    @IsOptional()
    @IsNumber()
    gracePeriodLate?: number;

    @ApiPropertyOptional({ example: 10, description: 'Minutes allowed before endTime before marked early leave' })
    @IsOptional()
    @IsNumber()
    gracePeriodEarly?: number;

    @ApiPropertyOptional({ example: true, description: 'Use shift start time as clock-in time if early' })
    @IsOptional()
    @IsBoolean()
    useShiftStartAsClockIn?: boolean;

    @ApiPropertyOptional({ example: false, description: 'Automatically clock out at maxOutTime' })
    @IsOptional()
    @IsBoolean()
    autoClockOut?: boolean;
}

export class ShiftsConfigDto {
    @ApiPropertyOptional({ type: [ShiftDto], description: 'List of available shifts' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ShiftDto)
    list?: ShiftDto[];

    @ApiPropertyOptional({ example: 'shift-1', description: 'Default shift ID to use' })
    @IsOptional()
    @IsString()
    defaultShiftId?: string;

    @ApiPropertyOptional({ enum: ShiftSelectionPolicy, description: 'How to select the active shift' })
    @IsOptional()
    @IsEnum(ShiftSelectionPolicy)
    selectionPolicy?: ShiftSelectionPolicy;
}

export class PayrollComponentDto {
    @ApiProperty({ example: 'comp-1' })
    @IsString()
    id: string;

    @ApiProperty({ example: 'Performance Bonus' })
    @IsString()
    name: string;

    @ApiProperty({ enum: PayrollComponentCategory })
    @IsEnum(PayrollComponentCategory)
    category: PayrollComponentCategory;

    @ApiProperty({ enum: PayrollComponentType })
    @IsEnum(PayrollComponentType)
    type: PayrollComponentType;

    @ApiProperty({ example: 5000 })
    @IsNumber()
    value: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isStatutory?: boolean;

    @ApiPropertyOptional({ description: 'Does this component affect the total reportable earnings?' })
    @IsOptional()
    @IsBoolean()
    affectsTotalEarnings?: boolean;

    @ApiPropertyOptional({ description: 'Minimum limit amount if percentage based' })
    @IsOptional()
    @IsNumber()
    minCap?: number;

    @ApiPropertyOptional({ description: 'Maximum limit amount if percentage based' })
    @IsOptional()
    @IsNumber()
    maxCap?: number;
}

export class SalaryComponentsConfigDto {
    @ApiPropertyOptional({ type: [PayrollComponentDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PayrollComponentDto)
    components?: PayrollComponentDto[];
}

export enum PayCycleFrequency {
    MONTHLY = 'MONTHLY',
    SEMI_MONTHLY = 'SEMI_MONTHLY',
    BI_WEEKLY = 'BI_WEEKLY',
    WEEKLY = 'WEEKLY',
    DAILY = 'DAILY'
}

export enum PayrollCalculationMethod {
    HOURLY_ATTENDANCE_WITH_OT = 'HOURLY_ATTENDANCE_WITH_OT',
    SHIFT_ATTENDANCE_WITH_OT = 'SHIFT_ATTENDANCE_WITH_OT',
    SHIFT_ATTENDANCE_FLAT = 'SHIFT_ATTENDANCE_FLAT',
    DAILY_ATTENDANCE_FLAT = 'DAILY_ATTENDANCE_FLAT',
    FIXED_MONTHLY_SALARY = 'FIXED_MONTHLY_SALARY'
}

export enum UnpaidLeaveAction {
    DEDUCT_FROM_TOTAL = 'DEDUCT_FROM_TOTAL',
    ADD_AS_DEDUCTION = 'ADD_AS_DEDUCTION'
}

export enum LateDeductionType {
    DIVISOR_BASED = 'DIVISOR_BASED',
    FIXED_AMOUNT = 'FIXED_AMOUNT'
}

export class PayrollSettingsConfigDto {
    @ApiProperty({ enum: PayCycleFrequency, example: PayCycleFrequency.MONTHLY })
    @IsEnum(PayCycleFrequency)
    frequency: PayCycleFrequency;

    @ApiProperty({ example: 'LAST', description: 'Day pattern: "1"-"31", "LAST", "MON"-"SUN"' })
    @IsString()
    runDay: string;

    @ApiPropertyOptional({ example: '2024-01-01', description: 'Reference date for Bi-Weekly cycles' })
    @IsOptional()
    @IsString()
    runDayAnchor?: string;

    @ApiProperty({ example: 5, description: 'Days before PayDay to close attendance' })
    @IsNumber()
    cutoffDaysBeforePayDay: number;

    @ApiProperty({ enum: PayrollCalculationMethod, example: PayrollCalculationMethod.FIXED_MONTHLY_SALARY })
    @IsEnum(PayrollCalculationMethod)
    calculationMethod: PayrollCalculationMethod;

    @ApiProperty({ example: 30, description: 'Divisor for rate calculation (30, 26, 22)' })
    @IsNumber()
    baseRateDivisor: number;

    // Deduction Rules
    @ApiProperty({ description: 'Automatically deduct for unpaid leaves/absences' })
    @IsBoolean()
    autoDeductUnpaidLeaves: boolean;

    @ApiProperty({ enum: UnpaidLeaveAction, example: UnpaidLeaveAction.DEDUCT_FROM_TOTAL })
    @IsEnum(UnpaidLeaveAction)
    unpaidLeaveAction: UnpaidLeaveAction;

    @ApiProperty({ enum: LateDeductionType, example: LateDeductionType.DIVISOR_BASED })
    @IsEnum(LateDeductionType)
    lateDeductionType: LateDeductionType;

    @ApiProperty({ example: 8, description: 'Divisor (e.g. 8 hours) or Fixed Amount' })
    @IsNumber()
    lateDeductionValue: number;
}

export enum WorkDayType {
    FULL = 'FULL',
    HALF = 'HALF',
    OFF = 'OFF'
}

export enum HalfDayShift {
    FIRST = 'FIRST',
    LAST = 'LAST'
}

export class DailyWorkConfigDto {
    @ApiProperty({ enum: WorkDayType })
    @IsEnum(WorkDayType)
    type: WorkDayType;

    @ApiPropertyOptional({ enum: HalfDayShift })
    @IsOptional()
    @IsEnum(HalfDayShift)
    halfDayShift?: HalfDayShift;
}

export class WorkingDaysConfigDto {
    @ApiProperty({ description: 'Default generic pattern for standard week (MON-SUN)' })
    @IsOptional()
    defaultPattern?: Record<string, DailyWorkConfigDto>;

    @ApiProperty({ description: 'Enable week-specific override patterns' })
    @IsOptional()
    @IsBoolean()
    isDynamic?: boolean;
}

export class PolicySettingsDto {
    @ApiPropertyOptional({ type: ShiftsConfigDto, description: 'Shifts configuration' })
    @IsOptional()
    @ValidateNested()
    @Type(() => ShiftsConfigDto)
    shifts?: ShiftsConfigDto;

    // Future sections (Attendance)
    @ApiPropertyOptional({ description: 'Attendance configuration' })
    @IsOptional()
    attendance?: any;

    @ApiPropertyOptional({ type: SalaryComponentsConfigDto, description: 'Salary components (additions/deductions) configuration' })
    @IsOptional()
    @ValidateNested()
    @Type(() => SalaryComponentsConfigDto)
    salaryComponents?: SalaryComponentsConfigDto;

    @ApiPropertyOptional({ type: PayrollSettingsConfigDto, description: 'Global payroll settings (cycles, dates, logic)' })
    @IsOptional()
    @ValidateNested()
    @Type(() => PayrollSettingsConfigDto)
    payrollConfiguration?: PayrollSettingsConfigDto;

    @ApiPropertyOptional({ type: WorkingDaysConfigDto, description: 'Working days configuration' })
    @IsOptional()
    @ValidateNested()
    @Type(() => WorkingDaysConfigDto)
    workingDays?: WorkingDaysConfigDto;
}
