import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType } from '../../common/enums/employee.enum';

export enum AccrualFrequency {
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
    HALF_YEARLY = 'HALF_YEARLY',
    YEARLY = 'YEARLY',
    CUSTOM = 'CUSTOM'
}

export enum EncashmentType {
    MULTIPLIER_BASED = 'MULTIPLIER_BASED',
    FIXED_AMOUNT = 'FIXED_AMOUNT'
}

export enum PolicyGenderTarget {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
    ALL = 'ALL'
}

export class LeaveTypeDto {
    @ApiProperty({ example: 'leave-1' })
    @IsString()
    id: string;

    @ApiProperty({ example: 'Annual Leave' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'AL' })
    @IsString()
    code: string;

    @ApiProperty({ enum: PolicyGenderTarget, default: PolicyGenderTarget.ALL })
    @IsEnum(PolicyGenderTarget)
    applicableGender: PolicyGenderTarget;

    @ApiProperty({ enum: EmploymentType, isArray: true, example: [EmploymentType.PERMANENT] })
    @IsArray()
    @IsEnum(EmploymentType, { each: true })
    applicableEmploymentTypes: EmploymentType[];

    @ApiProperty({ default: true })
    @IsBoolean()
    requiresApproval: boolean;

    // Short Leave
    @ApiProperty({ default: false })
    @IsBoolean()
    isShortLeave: boolean;

    @ApiPropertyOptional({ example: 90, description: 'Max duration in minutes if short leave' })
    @IsOptional()
    @IsNumber()
    maxDurationMinutes?: number;

    // Accrual
    @ApiProperty({ example: 14 })
    @IsNumber()
    baseAmount: number;

    @ApiProperty({ enum: AccrualFrequency, default: AccrualFrequency.YEARLY })
    @IsEnum(AccrualFrequency)
    accrualFrequency: AccrualFrequency;

    @ApiPropertyOptional({ example: 15, description: 'Interval in days if frequency is CUSTOM' })
    @IsOptional()
    @IsNumber()
    customFrequencyDays?: number;

    // Carry Over
    @ApiProperty({ default: false })
    @IsBoolean()
    canCarryOver: boolean;

    @ApiPropertyOptional({ example: 5 })
    @IsOptional()
    @IsNumber()
    maxCarryOverDays?: number;

    // Encashment
    @ApiProperty({ default: false })
    @IsBoolean()
    isEncashable: boolean;

    @ApiPropertyOptional({ enum: EncashmentType })
    @IsOptional()
    @IsEnum(EncashmentType)
    encashmentType?: EncashmentType;

    @ApiPropertyOptional({ example: 1.0, description: 'Multiplier for (Basic / Divisor)' })
    @IsOptional()
    @IsNumber()
    encashmentMultiplier?: number;

    @ApiPropertyOptional({ example: 1000 })
    @IsOptional()
    @IsNumber()
    fixedAmount?: number;
}

export class LeavesConfigDto {
    @ApiProperty({ type: [LeaveTypeDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LeaveTypeDto)
    leaveTypes: LeaveTypeDto[];
}
