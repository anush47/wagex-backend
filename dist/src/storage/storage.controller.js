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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const storage_service_1 = require("./storage.service");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../auth/roles.decorator");
const client_1 = require("@prisma/client");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const permissions_1 = require("../auth/permissions");
const upload_file_dto_1 = require("./dto/upload-file.dto");
const file_upload_response_dto_1 = require("./dto/file-upload-response.dto");
const storage_constants_1 = require("./storage.constants");
let StorageController = class StorageController {
    storageService;
    constructor(storageService) {
        this.storageService = storageService;
    }
    async uploadFile(file, body, queryCompanyId, req) {
        const companyId = queryCompanyId || body.companyId;
        const employeeId = body.employeeId;
        const user = req.user;
        if (!file)
            throw new common_1.BadRequestException('File is required');
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        if (user.role === client_1.Role.EMPLOYEE) {
            if (!employeeId) {
                throw new common_1.BadRequestException('Employees must provide employeeId to upload.');
            }
            const hasOwnership = user.employees?.some(e => e.id === employeeId && e.companyId === companyId);
            if (!hasOwnership) {
                throw new common_1.ForbiddenException('You can only upload to your linked employee profile.');
            }
        }
        return this.storageService.uploadFile(file, companyId, body.folder, employeeId, body.customFilename);
    }
    async getSignedUrl(key, req) {
        if (!key)
            throw new common_1.BadRequestException('Key is required');
        const parts = key.split('/');
        if (parts.length < 3 || parts[0] !== 'companies') {
            throw new common_1.BadRequestException('Invalid key format');
        }
        const resourceCompanyId = parts[1];
        const resourceFolder = parts[2];
        const user = req.user;
        if (user.role !== client_1.Role.ADMIN) {
            const hasAccess = user.memberships?.some(m => m.companyId === resourceCompanyId);
            if (!hasAccess) {
                throw new common_1.ForbiddenException('You do not have access to files in this company.');
            }
            if (user.role === client_1.Role.EMPLOYEE) {
                const isPublicFolder = storage_constants_1.ALLOWED_EMPLOYEE_FOLDERS.includes(resourceFolder);
                let isOwnFolder = false;
                if (resourceFolder === 'employees' && parts.length >= 4) {
                    const targetEmployeeId = parts[3];
                    isOwnFolder = user.employees?.some(e => e.id === targetEmployeeId && e.companyId === resourceCompanyId);
                }
                if (!isPublicFolder && !isOwnFolder) {
                    if (resourceFolder === 'employees') {
                        throw new common_1.ForbiddenException('You can only access your own personal files.');
                    }
                    else {
                        throw new common_1.ForbiddenException('You do not have permission to access private company files.');
                    }
                }
            }
        }
        return {
            url: await this.storageService.getSignedUrl(key)
        };
    }
    async deleteFile(key, req) {
        if (!key)
            throw new common_1.BadRequestException('Key is required');
        const parts = key.split('/');
        if (parts.length < 3 || parts[0] !== 'companies') {
            throw new common_1.BadRequestException('Invalid key format');
        }
        const resourceCompanyId = parts[1];
        const user = req.user;
        if (user.role !== client_1.Role.ADMIN) {
            const hasAccess = user.memberships?.some(m => m.companyId === resourceCompanyId);
            if (!hasAccess) {
                throw new common_1.ForbiddenException('You do not have access to delete files in this company.');
            }
        }
        if (user.role === client_1.Role.EMPLOYEE) {
            if (parts[2] !== 'employees') {
                throw new common_1.ForbiddenException('Employees can only delete their own files.');
            }
            const targetEmployeeId = parts[3];
            const hasOwnership = user.employees?.some(e => e.id === targetEmployeeId && e.companyId === resourceCompanyId);
            if (!hasOwnership) {
                throw new common_1.ForbiddenException('You do not have permission to delete this file.');
            }
        }
        await this.storageService.deleteFile(key);
        return { message: 'File deleted successfully' };
    }
};
exports.StorageController = StorageController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER, client_1.Role.EMPLOYEE),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.CAN_UPLOAD_FILES),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({ type: upload_file_dto_1.UploadFileDto }),
    (0, swagger_1.ApiOperation)({ summary: 'Upload file (Admin/Employer: Anywhere, Employee: Own folder only)' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: file_upload_response_dto_1.FileUploadResponseDto }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Query)('companyId')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upload_file_dto_1.UploadFileDto, String, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Get)('url'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER, client_1.Role.EMPLOYEE),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.VIEW_COMPANY),
    (0, swagger_1.ApiOperation)({ summary: 'Get signed URL (Strict Privacy Enforced)' }),
    __param(0, (0, common_1.Query)('key')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "getSignedUrl", null);
__decorate([
    (0, common_1.Delete)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER, client_1.Role.EMPLOYEE),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.CAN_DELETE_FILES),
    (0, swagger_1.ApiOperation)({ summary: 'Delete file (Admin/Employer: Any, Employee: Own only)' }),
    __param(0, (0, common_1.Query)('key')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "deleteFile", null);
exports.StorageController = StorageController = __decorate([
    (0, swagger_1.ApiTags)('Storage'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('storage'),
    __metadata("design:paramtypes", [storage_service_1.StorageService])
], StorageController);
//# sourceMappingURL=storage.controller.js.map