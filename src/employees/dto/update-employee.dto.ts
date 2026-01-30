import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
    @ApiPropertyOptional({ example: 'ACTIVE', description: 'Employment Status' })
    @IsOptional()
    @IsString()
    status?: string;
}
