import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

    @ApiPropertyOptional({ example: 'uuid-calendar', description: 'Override Calendar ID for Payroll' })
    @IsOptional()
    @IsString()
    calendarId?: string;
}
