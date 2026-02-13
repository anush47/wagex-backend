import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GenerateSalaryDto {
    @ApiProperty({ example: 'company-uuid' })
    @IsString()
    companyId: string;

    @ApiProperty({ example: '2024-01-01' })
    @IsDateString()
    periodStartDate: string;

    @ApiProperty({ example: '2024-01-31' })
    @IsDateString()
    periodEndDate: string;

    @ApiPropertyOptional({ type: [String], description: 'Optional list of employee IDs to generate for' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    employeeIds?: string[];
}

export class SalaryQueryDto {
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
    @IsString()
    employeeId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    status?: string;
}
