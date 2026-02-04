import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
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

export enum CalendarType {
    SL_DEFAULT = 'sl_default'
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

    @ApiPropertyOptional({ description: 'ID of the selected working calendar', default: CalendarType.SL_DEFAULT, enum: CalendarType })
    @IsOptional()
    @IsEnum(CalendarType)
    workingCalendar?: CalendarType;

    @ApiPropertyOptional({ description: 'ID of the selected payroll calendar', default: CalendarType.SL_DEFAULT, enum: CalendarType })
    @IsOptional()
    @IsEnum(CalendarType)
    payrollCalendar?: CalendarType;
}
