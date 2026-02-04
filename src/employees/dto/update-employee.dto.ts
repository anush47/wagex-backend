import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto';
import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    canSelfEdit?: boolean;

    @ApiProperty({ example: 'path/to/photo.jpg', required: false })
    @IsOptional()
    @IsString()
    photo?: string;

    @ApiProperty({ example: [], required: false })
    @IsOptional()
    files?: any;
}
