import { IsOptional, IsString, IsDateString, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class HolidayQueryDto {
    @ApiPropertyOptional({ description: 'Calendar ID to filter holidays' })
    @IsOptional()
    @IsString()
    calendarId?: string;

    @ApiPropertyOptional({ description: 'Search by holiday name' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by start date' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'Filter by end date' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Filter for public holidays' })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isPublic?: boolean;

    @ApiPropertyOptional({ description: 'Filter for mercantile holidays' })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isMercantile?: boolean;

    @ApiPropertyOptional({ description: 'Filter for bank holidays' })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isBank?: boolean;

    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Records per page', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}
