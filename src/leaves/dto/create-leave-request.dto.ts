import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsInt, Min, ValidateIf } from 'class-validator';
import { LeaveRequestType } from '../enums/leave.enum';

export class CreateLeaveRequestDto {
    @ApiProperty({ example: 'employee-uuid' })
    @IsNotEmpty()
    @IsString()
    employeeId: string;

    @ApiProperty({ example: 'company-uuid' })
    @IsNotEmpty()
    @IsString()
    companyId: string;

    @ApiProperty({ example: 'leave-type-1', description: 'Leave type ID from policy' })
    @IsNotEmpty()
    @IsString()
    leaveTypeId: string;

    @ApiProperty({ enum: LeaveRequestType, default: LeaveRequestType.FULL_DAY })
    @IsEnum(LeaveRequestType)
    type: LeaveRequestType;

    @ApiProperty({ example: '2025-02-10T00:00:00Z', description: 'For Full/Half: date only. For Short Leave: include time (e.g., 2025-02-10T10:30:00Z)' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ example: '2025-02-12T00:00:00Z', description: 'For Full/Half: date only. For Short Leave: include time (e.g., 2025-02-10T12:00:00Z)' })
    @IsDateString()
    endDate: string;

    @ApiPropertyOptional({ example: 'Family emergency' })
    @IsOptional()
    @IsString()
    reason?: string;

    @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
    @IsOptional()
    documents?: any[];

    @ApiPropertyOptional({ description: 'ID of the holiday being substituted' })
    @IsOptional()
    @IsString()
    holidayId?: string;
}
