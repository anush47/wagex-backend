import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { Express } from 'express';
import { FileUploadResponseDto } from './dto/file-upload-response.dto';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private readonly s3Client: S3Client;
    private readonly bucketName: string;

    constructor(private readonly configService: ConfigService) {
        const accountId = this.configService.get<string>('R2_ACCOUNT_ID') || '';
        const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID') || '';
        const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY') || '';

        this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || '';

        if (!accountId || !accessKeyId || !secretAccessKey || !this.bucketName) {
            this.logger.warn('R2 credentials are incomplete. StorageService will not function correctly.');
        }

        this.s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }

    /**
     * Uploads a file to R2 (Private bucket).
     * Path strategy: companies/{companyId}/{folder}/{filename}
     */
    async uploadFile(file: Express.Multer.File, companyId: string, folder: string = 'general'): Promise<FileUploadResponseDto> {
        const fileExtension = file.originalname.split('.').pop();
        const uniqueFilename = `${Date.now()}-${uuidv4()}.${fileExtension}`;
        const key = `companies/${companyId}/${folder}/${uniqueFilename}`;

        try {
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    // No ACL public-read. Default is private.
                    Metadata: {
                        originalName: file.originalname
                    }
                }),
            );

            this.logger.log(`File uploaded successfully: ${key}`);

            return {
                key,
                contentType: file.mimetype,
                originalName: file.originalname,
                size: file.size
            };
        } catch (error) {
            this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Generates a pre-signed URL for reading a file.
     * Valid for 1 hour (3600 seconds) by default.
     */
    async getSignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });

            return await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
        } catch (error) {
            this.logger.error(`Failed to generate signed URL for ${key}: ${error.message}`);
            throw error;
        }
    }

    async deleteFile(key: string): Promise<void> {
        try {
            await this.s3Client.send(
                new DeleteObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                }),
            );
            this.logger.log(`File deleted: ${key}`);
        } catch (error) {
            this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
            throw error;
        }
    }
}
