import { ConfigService } from '@nestjs/config';
import { FileUploadResponseDto } from './dto/file-upload-response.dto';
export declare class StorageService {
    private readonly configService;
    private readonly logger;
    private readonly s3Client;
    private readonly bucketName;
    constructor(configService: ConfigService);
    uploadFile(file: Express.Multer.File, companyId: string, folder?: string, employeeId?: string, customFilename?: string): Promise<FileUploadResponseDto>;
    getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
    deleteFile(key: string): Promise<void>;
}
