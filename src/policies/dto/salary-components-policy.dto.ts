import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PayrollComponentType {
    FLAT_AMOUNT = 'FLAT_AMOUNT',
    PERCENTAGE_BASIC = 'PERCENTAGE_BASIC',
    PERCENTAGE_GROSS = 'PERCENTAGE_GROSS',
}

export enum PayrollComponentCategory {
    ADDITION = 'ADDITION',
    DEDUCTION = 'DEDUCTION'
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
