import { IsEnum, IsString, IsNotEmpty, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class BroadcastNotificationDto {
    @ApiProperty({ enum: Role, description: 'Target audience role', required: false })
    @IsOptional()
    @IsEnum(Role)
    targetRole?: Role; // If null, means ALL (Admin only)

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiProperty({ type: [String], required: false, description: 'Specific user IDs to target (validated against permissions)' })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    userIds?: string[];

    @ApiProperty({ required: false, enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'], default: 'INFO' })
    @IsOptional()
    @IsEnum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']) // Using string literals to avoid import issues or define Enum in DTO
    type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

    @ApiProperty({ required: false })
    @IsOptional()
    metadata?: any;
}
