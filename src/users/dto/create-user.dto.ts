import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
    @ApiProperty({ example: 'user@example.com', description: 'User email address' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
    @IsString()
    name: string;

    @ApiProperty({ enum: Role, example: Role.EMPLOYEE, description: 'User role' })
    @IsEnum(Role)
    role: Role;

    @ApiPropertyOptional({ example: 'uuid-company-id', description: 'Company ID the user belongs to' })
    @IsOptional()
    @IsUUID()
    companyId?: string;
}
