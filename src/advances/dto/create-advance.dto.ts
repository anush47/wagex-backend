import { IsNumber, IsString, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class DeductionScheduleItemDto {
    @ApiProperty({ example: '2024-01-01' })
    @IsDateString()
    periodStartDate: string;

    @ApiProperty({ example: '2024-01-31' })
    @IsDateString()
    periodEndDate: string;

    @ApiProperty({ example: 5000 })
    @IsNumber()
    amount: number;
}

export class CreateSalaryAdvanceDto {
    @ApiProperty({ example: 'employee-uuid' })
    @IsString()
    employeeId: string;

    @ApiProperty({ example: 'company-uuid' })
    @IsString()
    companyId: string;

    @ApiProperty({ example: 15000 })
    @IsNumber()
    totalAmount: number;

    @ApiProperty({ example: '2024-01-10' })
    @IsDateString()
    date: string;

    @ApiPropertyOptional({ example: 'Personal emergency' })
    @IsOptional()
    @IsString()
    reason?: string;

    @ApiPropertyOptional({ type: [DeductionScheduleItemDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DeductionScheduleItemDto)
    deductionSchedule?: DeductionScheduleItemDto[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    remarks?: string;
}
