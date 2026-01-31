import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc'
}

export class SortDto {
    @ApiPropertyOptional({ example: 'createdAt', description: 'Field to sort by' })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiPropertyOptional({ enum: SortOrder, example: SortOrder.DESC, description: 'Sort order' })
    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.ASC;
}
