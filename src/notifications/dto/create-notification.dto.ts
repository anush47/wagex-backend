import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { NotificationType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
    @IsUUID()
    userId: string;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    message: string;

    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType;

    @IsOptional()
    metadata?: any;
}
