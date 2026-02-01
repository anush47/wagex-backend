import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UploadFileDto {
    @ApiProperty({ type: 'string', format: 'binary', description: 'File to upload' })
    @IsOptional()
    file: any;

    @ApiProperty({ description: 'Target folder (e.g., "logos", "documents")', default: 'general', required: false })
    @IsOptional()
    @IsString()
    folder?: string;

    @ApiProperty({ description: 'Company ID context', type: 'string', format: 'uuid', required: false })
    @IsOptional()
    @IsUUID()
    companyId?: string;

    @ApiProperty({ description: 'Employee ID context', type: 'string', format: 'uuid', required: false })
    @IsOptional()
    @IsUUID()
    employeeId?: string;
}
