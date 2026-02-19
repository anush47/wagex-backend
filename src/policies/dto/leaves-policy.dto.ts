import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, Gender } from '../../common/enums/employee.enum';

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

export enum AccrualMethod {
    PRO_RATA = 'PRO_RATA',           // Calculate based on remaining days in period
    FULL_UPFRONT = 'FULL_UPFRONT'    // Grant full amount at period start
}

export enum HolidayEarnCategory {
    PUBLIC = 'PUBLIC',
    MERCANTILE = 'MERCANTILE',
    BANK = 'BANK'
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

    @ApiPropertyOptional({ example: '#3b82f6' })
    @IsOptional()
    @IsString()
    color?: string;

    @ApiProperty({ enum: Gender, isArray: true, example: [Gender.MALE, Gender.FEMALE] })
    @IsArray()
    @IsEnum(Gender, { each: true })
    applicableGenders: Gender[];

    @ApiProperty({ enum: EmploymentType, isArray: true, example: [EmploymentType.PERMANENT] })
    @IsArray()
    @IsEnum(EmploymentType, { each: true })
    applicableEmploymentTypes: EmploymentType[];

    @ApiProperty({ default: true })
    @IsBoolean()
    requiresApproval: boolean;

    @ApiPropertyOptional({ example: 3, description: 'Approval required if consecutive days exceed this' })
    @IsOptional()
    @IsNumber()
    approvalRequiredIfConsecutiveMoreThan?: number;

    // Short Leave
    @ApiProperty({ default: false })
    @IsBoolean()
    isShortLeave: boolean;

    @ApiPropertyOptional({ example: 90, description: 'Max duration in minutes if short leave' })
    @IsOptional()
    @IsNumber()
    maxDurationMinutes?: number;

    // Payment Status
    @ApiProperty({ default: true, description: 'Whether this leave type is paid' })
    @IsBoolean()
    isPaid: boolean = true;

    // Accrual
    @ApiProperty({ example: 14 })
    @IsNumber()
    baseAmount: number;

    @ApiProperty({ enum: AccrualFrequency, default: AccrualFrequency.YEARLY })
    @IsEnum(AccrualFrequency)
    accrualFrequency: AccrualFrequency;

    @ApiProperty({
        enum: AccrualMethod,
        default: AccrualMethod.PRO_RATA,
        description: 'How to calculate entitlement for mid-period joiners'
    })
    @IsEnum(AccrualMethod)
    accrualMethod: AccrualMethod;

    @ApiPropertyOptional({ example: 15, description: 'Interval in days if frequency is CUSTOM' })
    @IsOptional()
    @IsNumber()
    customFrequencyDays?: number;

    // Rules
    @ApiPropertyOptional({ example: 30, description: 'Minimum days between two requests of this type' })
    @IsOptional()
    @IsNumber()
    minDelayBetweenRequestsDays?: number;

    @ApiPropertyOptional({ example: 7, description: 'Minimum notice days required for this leave' })
    @IsOptional()
    @IsNumber()
    minNoticeDays?: number;

    @ApiPropertyOptional({ default: false, description: 'Allow applying for past dates' })
    @IsOptional()
    @IsBoolean()
    canApplyBackdated?: boolean;

    @ApiPropertyOptional({ example: 5, description: 'Max consecutive days allowed for this leave' })
    @IsOptional()
    @IsNumber()
    maxConsecutiveDays?: number;

    @ApiPropertyOptional({ default: false, description: 'Require supporting documents (medical, etc)' })
    @IsOptional()
    @IsBoolean()
    requireDocuments?: boolean;

    @ApiPropertyOptional({ example: 2, description: 'Require documents if consecutive days exceed this' })
    @IsOptional()
    @IsNumber()
    requireDocumentsIfConsecutiveMoreThan?: number;

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

    // Holiday Replacement
    @ApiProperty({ default: false, description: 'Whether this leave type is earned by working on holidays' })
    @IsBoolean()
    isHolidayReplacement: boolean = false;

    @ApiPropertyOptional({ enum: HolidayEarnCategory, isArray: true, description: 'The holiday types that trigger earning this leave' })
    @IsOptional()
    @IsArray()
    @IsEnum(HolidayEarnCategory, { each: true })
    earnedOnHolidayCategories?: HolidayEarnCategory[];
}

export class LeavesConfigDto {
    @ApiProperty({ type: [LeaveTypeDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LeaveTypeDto)
    leaveTypes: LeaveTypeDto[];
}
