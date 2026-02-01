import { StorageService } from './storage.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileUploadResponseDto } from './dto/file-upload-response.dto';
export declare class StorageController {
    private readonly storageService;
    constructor(storageService: StorageService);
    uploadFile(file: Express.Multer.File, body: UploadFileDto, queryCompanyId: string): Promise<FileUploadResponseDto>;
    getSignedUrl(key: string, req: any): Promise<{
        url: string;
    }>;
}
