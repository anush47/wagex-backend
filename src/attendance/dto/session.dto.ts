import { IsOptional, IsString, IsDateString, IsBoolean, IsNumber, IsUUID, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SessionWorkDayStatus, ApprovalStatus, EventStatus } from '@prisma/client';

export class UpdateSessionDto {
    @ApiPropertyOptional({ enum: ApprovalStatus, description: 'Check-in approval status' })
    @IsOptional()
    @IsEnum(ApprovalStatus)
    inApprovalStatus?: ApprovalStatus;

    @ApiPropertyOptional({ enum: ApprovalStatus, description: 'Check-out approval status' })
    @IsOptional()
    @IsEnum(ApprovalStatus)
    outApprovalStatus?: ApprovalStatus;

    @ApiPropertyOptional({ description: 'Check-in time in ISO format', type: String, nullable: true })
    @IsOptional()
    @IsDateString()
    checkInTime?: string | null;

    @ApiPropertyOptional({ description: 'Check-out time in ISO format', type: String, nullable: true })
    @IsOptional()
    @IsDateString()
    checkOutTime?: string | null;

    @ApiPropertyOptional({ description: 'Shift ID override' })
    @IsOptional()
    @IsUUID()
    shiftId?: string;

    @ApiPropertyOptional({ enum: SessionWorkDayStatus, description: 'Work day status' })
    @IsOptional()
    @IsEnum(SessionWorkDayStatus)
    workDayStatus?: SessionWorkDayStatus;

    @ApiPropertyOptional({ description: 'Late flag' })
    @IsOptional()
    @IsBoolean()
    isLate?: boolean;

    @ApiPropertyOptional({ description: 'Early leave flag' })
    @IsOptional()
    @IsBoolean()
    isEarlyLeave?: boolean;

    @ApiPropertyOptional({ description: 'On leave flag' })
    @IsOptional()
    @IsBoolean()
    isOnLeave?: boolean;

    @ApiPropertyOptional({ description: 'Half day flag' })
    @IsOptional()
    @IsBoolean()
    isHalfDay?: boolean;

    @ApiPropertyOptional({ description: 'Short leave flag' })
    @IsOptional()
    @IsBoolean()
    hasShortLeave?: boolean;

    @ApiPropertyOptional({ description: 'Additional remarks' })
    @IsOptional()
    @IsString()
    remarks?: string;

    @ApiPropertyOptional({ description: 'Total minutes override' })
    @IsOptional()
    @IsNumber()
    totalMinutes?: number;

    @ApiPropertyOptional({ description: 'Break minutes override' })
    @IsOptional()
    @IsNumber()
    breakMinutes?: number;

    @ApiPropertyOptional({ description: 'Work minutes override' })
    @IsOptional()
    @IsNumber()
    workMinutes?: number;

    @ApiPropertyOptional({ description: 'Overtime minutes override' })
    @IsOptional()
    @IsNumber()
    overtimeMinutes?: number;
}

export class SessionQueryDto {
    @ApiPropertyOptional({ description: 'Company ID filter' })
    @IsOptional()
    @IsUUID()
    companyId?: string;

    @ApiPropertyOptional({ description: 'Employee ID filter' })
    @IsOptional()
    @IsUUID()
    employeeId?: string;

    @ApiPropertyOptional({ description: 'Start date filter (ISO format)' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'End date filter (ISO format)' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    page?: number;

    @ApiPropertyOptional({ description: 'Items per page', default: 15 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    limit?: number;

    @ApiPropertyOptional({ description: 'Filter only pending approvals' })
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    isPending?: boolean;
}

export class EventQueryDto {
    @ApiPropertyOptional({ description: 'Company ID filter' })
    @IsOptional()
    @IsUUID()
    companyId?: string;

    @ApiPropertyOptional({ description: 'Employee ID filter' })
    @IsOptional()
    @IsUUID()
    employeeId?: string;

    @ApiPropertyOptional({ description: 'Start date filter (ISO format)' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'End date filter (ISO format)' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    page?: number;

    @ApiPropertyOptional({ description: 'Items per page', default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    limit?: number;

    @ApiPropertyOptional({ enum: EventStatus, description: 'Event status filter' })
    @IsOptional()
    @IsEnum(EventStatus)
    status?: EventStatus;
}
