"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
let StorageService = StorageService_1 = class StorageService {
    configService;
    logger = new common_1.Logger(StorageService_1.name);
    s3Client;
    bucketName;
    constructor(configService) {
        this.configService = configService;
        const accountId = this.configService.get('R2_ACCOUNT_ID') || '';
        const accessKeyId = this.configService.get('R2_ACCESS_KEY_ID') || '';
        const secretAccessKey = this.configService.get('R2_SECRET_ACCESS_KEY') || '';
        this.bucketName = this.configService.get('R2_BUCKET_NAME') || '';
        if (!accountId || !accessKeyId || !secretAccessKey || !this.bucketName) {
            this.logger.warn('R2 credentials are incomplete. StorageService will not function correctly.');
        }
        this.s3Client = new client_s3_1.S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }
    async uploadFile(file, companyId, folder = 'general', employeeId) {
        const fileExtension = file.originalname.split('.').pop();
        const uniqueFilename = `${Date.now()}-${(0, uuid_1.v4)()}.${fileExtension}`;
        let key = `companies/${companyId}/${folder}/${uniqueFilename}`;
        if (employeeId) {
            key = `companies/${companyId}/employees/${employeeId}/${folder}/${uniqueFilename}`;
        }
        try {
            await this.s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                Metadata: {
                    originalName: file.originalname
                }
            }));
            this.logger.log(`File uploaded successfully: ${key}`);
            return {
                key,
                contentType: file.mimetype,
                originalName: file.originalname,
                size: file.size
            };
        }
        catch (error) {
            this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getSignedUrl(key, expiresInSeconds = 3600) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });
            return await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn: expiresInSeconds });
        }
        catch (error) {
            this.logger.error(`Failed to generate signed URL for ${key}: ${error.message}`);
            throw error;
        }
    }
    async deleteFile(key) {
        try {
            await this.s3Client.send(new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            }));
            this.logger.log(`File deleted: ${key}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map