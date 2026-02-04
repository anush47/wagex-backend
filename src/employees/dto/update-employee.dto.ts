import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    canSelfEdit?: boolean;
}
