import { IsArray, IsDateString, IsOptional, IsString, IsInt, Min } from 'class-validator';
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

  @ApiPropertyOptional({ example: '2024-01-26' })
  @IsOptional()
  @IsDateString()
  attendanceStartDate?: string;

  @ApiPropertyOptional({ example: '2024-02-25' })
  @IsOptional()
  @IsDateString()
  attendanceEndDate?: string;

  @ApiPropertyOptional({ example: '2024-02-28' })
  @IsOptional()
  @IsDateString()
  payDate?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  excludeEpf?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsOptional()
  excludeEtf?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

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

export class SalarySaveItemDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty()
  @IsDateString()
  periodStartDate: string;

  @ApiProperty()
  @IsDateString()
  periodEndDate: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  basicSalary: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  otAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  otAdjustment?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  otAdjustmentReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  recoveryAdjustment?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recoveryAdjustmentReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  sessionIds: string[];

  // Add other fields from the preview as needed
  @ApiProperty()
  @IsInt()
  netSalary: number;

  @ApiPropertyOptional()
  @IsOptional()
  otBreakdown?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  noPayAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  noPayBreakdown?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  taxAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  components?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  advanceDeduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  advanceAdjustments?: any[];
}
