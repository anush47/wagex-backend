import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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



export enum LateDeductionType {
    DIVISOR_BASED = 'DIVISOR_BASED',
    FIXED_AMOUNT = 'FIXED_AMOUNT'
}

export enum OvertimeCalculationMethod {
    BASIC_DIVISOR = 'BASIC_DIVISOR',
    GROSS_DIVISOR = 'GROSS_DIVISOR',
    FIXED_HOURLY = 'FIXED_HOURLY'
}

export enum OvertimeDayType {
    WORKING_DAY = 'WORKING_DAY',
    HALF_DAY = 'HALF_DAY',
    OFF_DAY = 'OFF_DAY',
    HOLIDAY = 'HOLIDAY',
    ANY = 'ANY'
}

export class OvertimeTierDto {
    @ApiProperty({ example: 0, description: 'Minutes after OT starts for this tier (0 for start)' })
    @IsNumber()
    thresholdMinutes: number;

    @ApiProperty({ example: 1.5, description: 'Multiplier for this tier' })
    @IsNumber()
    multiplier: number;
}

export class OvertimeRuleDto {
    @ApiProperty({ example: 'rule-id' })
    @IsString()
    id: string;

    @ApiProperty({ example: 'Normal Workday OT' })
    @IsString()
    name: string;

    @ApiProperty({ enum: OvertimeDayType, example: OvertimeDayType.WORKING_DAY })
    @IsEnum(OvertimeDayType)
    dayStatus: OvertimeDayType;

    @ApiPropertyOptional({ example: true, description: 'Whether this rule applies to holidays' })
    @IsOptional()
    @IsBoolean()
    isHoliday?: boolean;

    @ApiPropertyOptional({ example: ['PUBLIC', 'MERCANTILE'], isArray: true })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    holidayTypes?: string[];

    @ApiProperty({ example: true })
    @IsBoolean()
    otEnabled: boolean;

    @ApiProperty({ example: 480, description: 'OT begins after this many minutes of work' })
    @IsNumber()
    startAfterMinutes: number;

    @ApiProperty({ type: [OvertimeTierDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OvertimeTierDto)
    tiers: OvertimeTierDto[];

    @ApiPropertyOptional({ description: 'Whether OT from this rule affects total earnings for statutory calculations', default: true })
    @IsOptional()
    @IsBoolean()
    affectTotalEarnings?: boolean = true;
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

    @ApiProperty({ description: 'Automatically deduct for unpaid leaves/absences' })
    @IsBoolean()
    autoDeductUnpaidLeaves: boolean;

    @ApiPropertyOptional({ enum: LateDeductionType, example: LateDeductionType.DIVISOR_BASED })
    @IsOptional()
    @IsEnum(LateDeductionType)
    unpaidLeaveFullDayType?: LateDeductionType = LateDeductionType.DIVISOR_BASED;

    @ApiPropertyOptional({ example: 1, description: 'Divisor or Fixed Amount for full day unpaid leave' })
    @IsOptional()
    @IsNumber()
    unpaidLeaveFullDayValue?: number = 1;

    @ApiPropertyOptional({ enum: LateDeductionType, example: LateDeductionType.DIVISOR_BASED })
    @IsOptional()
    @IsEnum(LateDeductionType)
    unpaidLeaveHalfDayType?: LateDeductionType = LateDeductionType.DIVISOR_BASED;

    @ApiPropertyOptional({ example: 0.5, description: 'Divisor or Fixed Amount for half day unpaid leave' })
    @IsOptional()
    @IsNumber()
    unpaidLeaveHalfDayValue?: number = 0.5;

    @ApiPropertyOptional({ description: 'Whether unpaid leave/absences affect Total Earnings for statutory calculations' })
    @IsOptional()
    @IsBoolean()
    unpaidLeavesAffectTotalEarnings?: boolean = false;

    @ApiProperty({ description: 'Automatically deduct for late arrivals/early leaves' })
    @IsOptional()
    @IsBoolean()
    autoDeductLate?: boolean = true;

    @ApiPropertyOptional({ description: 'Whether late deductions affect Total Earnings for statutory calculations' })
    @IsOptional()
    @IsBoolean()
    lateDeductionsAffectTotalEarnings?: boolean = false;

    @ApiProperty({ enum: LateDeductionType, example: LateDeductionType.DIVISOR_BASED })
    @IsEnum(LateDeductionType)
    lateDeductionType: LateDeductionType;

    @ApiProperty({ example: 8, description: 'Divisor (e.g. 8 hours) or Fixed Amount' })
    @IsNumber()
    lateDeductionValue: number;

    @ApiPropertyOptional({ example: 15, description: 'Grace period in minutes before deduction starts' })
    @IsOptional()
    @IsNumber()
    lateDeductionGraceMinutes?: number = 0;

    // Overtime Settings
    @ApiPropertyOptional({ enum: OvertimeCalculationMethod })
    @IsOptional()
    @IsEnum(OvertimeCalculationMethod)
    otCalculationMethod?: OvertimeCalculationMethod = OvertimeCalculationMethod.BASIC_DIVISOR;

    @ApiPropertyOptional({ example: 200 })
    @IsOptional()
    @IsNumber()
    otDivisor?: number = 200;

    @ApiPropertyOptional({ enum: LateDeductionType, example: LateDeductionType.DIVISOR_BASED })
    @IsOptional()
    @IsEnum(LateDeductionType)
    otHourlyType?: LateDeductionType = LateDeductionType.DIVISOR_BASED;

    @ApiPropertyOptional({ example: 8, description: 'Divisor (e.g. 8 hours) or Fixed Amount for OT hourly rate' })
    @IsOptional()
    @IsNumber()
    otHourlyValue?: number = 8;

    @ApiPropertyOptional({ example: 1.5 })
    @IsOptional()
    @IsNumber()
    otNormalRate?: number = 1.5;

    @ApiPropertyOptional({ example: 2.0 })
    @IsOptional()
    @IsNumber()
    otDoubleRate?: number = 2.0;

    @ApiPropertyOptional({ example: 3.0 })
    @IsOptional()
    @IsNumber()
    otTripleRate?: number = 3.0;

    @ApiProperty({ description: 'Automatically create draft salaries' })
    @IsBoolean()
    enableAutoDraft: boolean;

    @ApiPropertyOptional({ example: 3, description: 'Days before PayDay to create automatic draft' })
    @IsOptional()
    @IsNumber()
    draftCreationDaysBeforePayDay?: number;

    @ApiPropertyOptional({ example: 'uuid-calendar', description: 'Override Calendar ID for Payroll' })
    @IsOptional()
    @IsString()
    calendarId?: string;

    @ApiPropertyOptional({ description: 'Automatically acknowledge payments' })
    @IsOptional()
    @IsBoolean()
    autoAcknowledgePayments?: boolean = false;

    @ApiPropertyOptional({ type: [OvertimeRuleDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OvertimeRuleDto)
    otRules?: OvertimeRuleDto[] = [];
}
