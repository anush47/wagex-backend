import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { BaseUserProfileDto } from '../../users/dto/base-user-profile.dto';

export class RegisterDto extends BaseUserProfileDto {
    /* Inherits: nameWithInitials, fullName, address, phone */

    @ApiProperty({ example: Role.EMPLOYER, enum: Role, description: 'Role to register as (EMPLOYER/EMPLOYEE)', required: false })
    @IsOptional()
    @IsEnum(Role)
    role?: Role;

    @ApiProperty({ example: 'My Company Inc.', required: false, description: 'Company Name (Required if role is EMPLOYER)' })
    @IsOptional()
    @IsString()
    companyName?: string;
}
