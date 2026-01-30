import { PartialType } from '@nestjs/swagger';
import { BaseUserProfileDto } from './base-user-profile.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserDto extends PartialType(BaseUserProfileDto) {
    @ApiPropertyOptional({ example: true, description: 'Whether the user account is active' })
    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
