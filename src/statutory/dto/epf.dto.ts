import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsInt, Min, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class GenerateEpfDto {
    @ApiPropertyOptional({ example: 'company-uuid' })
    @IsOptional()
    @IsString()
    companyId?: string;

    @ApiProperty({ example: 3 })
    @IsInt()
    @Min(1)
    month: number;

    @ApiProperty({ example: 2026 })
    @IsInt()
    @Min(2000)
    year: number;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    salaryIds?: string[];
}

export class CreateEpfDto extends GenerateEpfDto {
    @ApiProperty({ example: 'REF123456' })
    @IsOptional()
    @IsString()
    referenceNo?: string;

    @ApiProperty({ example: 50000.0 })
    @IsNumber()
    totalContribution: number;

    @ApiPropertyOptional({ example: 0.0 })
    @IsOptional()
    @IsNumber()
    surcharge?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    paidDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    slipUrl?: string;

    @ApiPropertyOptional({ enum: PaymentMethod })
    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bankName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bankBranch?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bankCode?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    branchCode?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    chequeNo?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    remarks?: string;
}

export class UpdateEpfDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    referenceNo?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    totalContribution?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    surcharge?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    paidDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    slipUrl?: string;

    @ApiPropertyOptional({ enum: PaymentMethod })
    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bankName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bankBranch?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bankCode?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    branchCode?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    chequeNo?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    remarks?: string;
}

export class EpfQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    companyId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    month?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    year?: number;
}
