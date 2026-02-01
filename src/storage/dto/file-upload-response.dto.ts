import { ApiProperty } from '@nestjs/swagger';

export class FileUploadResponseDto {
    @ApiProperty({ description: 'Unique storage key (path)' })
    key: string;

    @ApiProperty({ description: 'MIME type of the uploaded file' })
    contentType: string;

    @ApiProperty({ description: 'Original filename' })
    originalName: string;

    @ApiProperty({ description: 'Size in bytes' })
    size: number;
}
