import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

    @ApiPropertyOptional({ description: 'Whether work on this day affects total earnings for statutory calculations', default: true })
    @IsOptional()
    @IsBoolean()
    affectTotalEarnings?: boolean = true;
}

export class WorkingDaysConfigDto {
    @ApiProperty({ description: 'Default generic pattern for standard week (MON-SUN)' })
    @IsOptional()
    defaultPattern?: Record<string, DailyWorkConfigDto>;

    @ApiProperty({ description: 'Enable week-specific override patterns' })
    @IsOptional()
    @IsBoolean()
    isDynamic?: boolean;

    @ApiPropertyOptional({ description: 'ID of the selected working calendar' })
    @IsOptional()
    @IsString()
    workingCalendar?: string;

    @ApiPropertyOptional({ description: 'ID of the selected payroll calendar' })
    @IsOptional()
    @IsString()
    payrollCalendar?: string;

    @ApiPropertyOptional({ description: 'Default affect total earnings setting for working days', default: true })
    @IsOptional()
    @IsBoolean()
    affectTotalEarnings?: boolean = true;
}
