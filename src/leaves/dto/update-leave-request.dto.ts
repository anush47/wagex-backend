import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeaveStatus } from '../enums/leave.enum';

export class UpdateLeaveRequestDto {
    @ApiPropertyOptional({ enum: LeaveStatus })
    @IsOptional()
    @IsEnum(LeaveStatus)
    status?: LeaveStatus;

    @ApiPropertyOptional({ example: 'Approved for family emergency' })
    @IsOptional()
    @IsString()
    responseReason?: string;

    @ApiPropertyOptional({ example: 'manager-uuid' })
    @IsOptional()
    @IsString()
    managerId?: string;
}
