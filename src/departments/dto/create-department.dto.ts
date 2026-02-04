import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateDepartmentDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    companyId: string;

    @ApiProperty({ required: false })
    @IsUUID()
    @IsOptional()
    parentId?: string;

    @ApiProperty({ required: false })
    @IsUUID()
    @IsOptional()
    headId?: string;
}
