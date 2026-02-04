import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ShiftSelectionPolicy {
    FIXED = 'FIXED',
    CLOSEST_START_TIME = 'CLOSEST_START_TIME',
    MANUAL = 'MANUAL',
    EMPLOYEE_ROSTER = 'EMPLOYEE_ROSTER',
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
