import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BaseUserProfileDto {
    @ApiProperty({ example: 'J. Doe', description: 'Name with Initials' })
    @IsNotEmpty()
    @IsString()
    nameWithInitials: string;

    @ApiProperty({ example: 'John Doe', description: 'Full Name' })
    @IsNotEmpty()
    @IsString()
    fullName: string;

    @ApiProperty({ example: '123 Main St, Springfield', description: 'Residential Address', required: false })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({ example: '+1 555 123 4567', description: 'Phone Number', required: false })
    @IsOptional()
    @IsString()
    phone?: string;
}
