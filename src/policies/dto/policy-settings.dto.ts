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

export class PayrollConfigDto {
    @ApiPropertyOptional({ type: [PayrollComponentDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PayrollComponentDto)
    components?: PayrollComponentDto[];
}

export class PolicySettingsDto {
    @ApiPropertyOptional({ type: ShiftsConfigDto, description: 'Shifts configuration' })
    @IsOptional()
    @ValidateNested()
    @Type(() => ShiftsConfigDto)
    shifts?: ShiftsConfigDto;

    // Future sections (Attendance, Payroll) can be added here
    @ApiPropertyOptional({ description: 'Attendance configuration' })
    @IsOptional()
    attendance?: any; // Placeholder for now

    @ApiPropertyOptional({ type: PayrollConfigDto, description: 'Payroll configuration' })
    @IsOptional()
    @ValidateNested()
    @Type(() => PayrollConfigDto)
    payroll?: PayrollConfigDto;
}
