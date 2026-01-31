import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SearchDto {
    @ApiPropertyOptional({ example: 'john', description: 'Search query' })
    @IsOptional()
    @IsString()
    search?: string;
}
