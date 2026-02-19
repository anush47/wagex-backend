import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PayrollComponentType {
    FLAT_AMOUNT = 'FLAT_AMOUNT',
    PERCENTAGE_BASIC = 'PERCENTAGE_BASIC',
    PERCENTAGE_TOTAL_EARNINGS = 'PERCENTAGE_TOTAL_EARNINGS',
}

export enum PayrollComponentCategory {
    ADDITION = 'ADDITION',
    DEDUCTION = 'DEDUCTION'
}

export enum PayrollComponentSystemType {
    NONE = 'NONE',
    EPF_EMPLOYEE = 'EPF_EMPLOYEE',       // Employee Share (8%)
    EPF_EMPLOYER = 'EPF_EMPLOYER',       // Employer Share (12%) - Informational/Accounting
    ETF_EMPLOYER = 'ETF_EMPLOYER',       // Employer Share (3%) - Informational/Accounting
    HOLIDAY_PAY = 'HOLIDAY_PAY',         // Pay for working on holidays
    NO_PAY_DEDUCTION = 'NO_PAY_DEDUCTION' // Deduction for unpaid absences/leaves
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

    @ApiPropertyOptional({ enum: PayrollComponentSystemType, description: 'If this component is system-calculated (like EPF or Holiday Pay)' })
    @IsOptional()
    @IsEnum(PayrollComponentSystemType)
    systemType?: PayrollComponentSystemType = PayrollComponentSystemType.NONE;
}

export class SalaryComponentsConfigDto {
    @ApiPropertyOptional({ type: [PayrollComponentDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PayrollComponentDto)
    components?: PayrollComponentDto[];
}
