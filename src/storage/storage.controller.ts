import { Controller, Post, UploadedFile, UseInterceptors, Body, UseGuards, Query, BadRequestException, Delete, Param, Get, ForbiddenException, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import type { Express } from 'express';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileUploadResponseDto } from './dto/file-upload-response.dto';
import { ALLOWED_EMPLOYEE_FOLDERS } from './storage.constants';

@ApiTags('Storage')
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
    constructor(
        private readonly storageService: StorageService,
    ) { }

    @Post('upload')
    @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
    @Permissions(Permission.MANAGE_COMPANY, Permission.CAN_UPLOAD_FILES)
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: UploadFileDto })
    @ApiOperation({ summary: 'Upload file (Admin/Employer: Anywhere, Employee: Own folder only)' })
    @ApiResponse({ status: 201, type: FileUploadResponseDto })
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: UploadFileDto,
        @Query('companyId') queryCompanyId: string,
        @Request() req
    ): Promise<FileUploadResponseDto> {
        // Resolve companyId
        const companyId = queryCompanyId || body.companyId;
        const employeeId = body.employeeId;
        const user = req.user;

        if (!file) throw new BadRequestException('File is required');
        if (!companyId) throw new BadRequestException('companyId is required');

        // Employee Logic: Strict Ownership
        if (user.role === Role.EMPLOYEE) {
            // Must provide employeeId
            if (!employeeId) {
                throw new BadRequestException('Employees must provide employeeId to upload.');
            }

            // Verify User <-> Employee Link
            const hasOwnership = user.employees?.some(e => e.id === employeeId && e.companyId === companyId);
            if (!hasOwnership) {
                throw new ForbiddenException('You can only upload to your linked employee profile.');
            }
        }

        return this.storageService.uploadFile(file, companyId, body.folder, employeeId, body.customFilename);
    }

    @Get('url')
    @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
    @Permissions(Permission.VIEW_COMPANY)
    @ApiOperation({ summary: 'Get signed URL (Strict Privacy Enforced)' })
    async getSignedUrl(@Query('key') key: string, @Request() req) {
        if (!key) throw new BadRequestException('Key is required');

        // Extract companyId and Folder from key: companies/{companyId}/{folder}/{file}
        const parts = key.split('/');
        if (parts.length < 3 || parts[0] !== 'companies') {
            throw new BadRequestException('Invalid key format');
        }
        const resourceCompanyId = parts[1];
        const resourceFolder = parts[2];
        const user = req.user;

        // Tenancy Check
        if (user.role !== Role.ADMIN) {
            // 1. Company Membership Check
            const hasAccess = user.memberships?.some(m => m.companyId === resourceCompanyId);
            if (!hasAccess) {
                throw new ForbiddenException('You do not have access to files in this company.');
            }

            // 2. Intra-Company Privacy Check for Employees
            if (user.role === Role.EMPLOYEE) {
                const isPublicFolder = ALLOWED_EMPLOYEE_FOLDERS.includes(resourceFolder);
                let isOwnFolder = false;

                // Check ownership if in 'employees' folder
                if (resourceFolder === 'employees' && parts.length >= 4) {
                    const targetEmployeeId = parts[3];
                    // Verify ownership using the 'employees' relation populated by Auth Strategy
                    isOwnFolder = user.employees?.some(e => e.id === targetEmployeeId && e.companyId === resourceCompanyId);
                }

                if (!isPublicFolder && !isOwnFolder) {
                    if (resourceFolder === 'employees') {
                        throw new ForbiddenException('You can only access your own personal files.');
                    } else {
                        throw new ForbiddenException('You do not have permission to access private company files.');
                    }
                }
            }
        }

        return {
            url: await this.storageService.getSignedUrl(key)
        };
    }

    @Delete()
    @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
    @Permissions(Permission.MANAGE_COMPANY, Permission.CAN_DELETE_FILES)
    @ApiOperation({ summary: 'Delete file (Admin/Employer: Any, Employee: Own only)' })
    async deleteFile(@Query('key') key: string, @Request() req) {
        if (!key) throw new BadRequestException('Key is required');

        const parts = key.split('/');
        if (parts.length < 3 || parts[0] !== 'companies') {
            throw new BadRequestException('Invalid key format');
        }
        const resourceCompanyId = parts[1];
        const user = req.user;

        // Tenancy Check
        if (user.role !== Role.ADMIN) {
            const hasAccess = user.memberships?.some(m => m.companyId === resourceCompanyId);
            if (!hasAccess) {
                throw new ForbiddenException('You do not have access to delete files in this company.');
            }
        }

        // Employee Specific Check
        if (user.role === Role.EMPLOYEE) {
            // Must be in 'employees/{id}/...' folder
            if (parts[2] !== 'employees') {
                throw new ForbiddenException('Employees can only delete their own files.');
            }

            const targetEmployeeId = parts[3];
            // Verify ownership using the 'employees' relation populated by Auth Strategy
            const hasOwnership = user.employees?.some(e => e.id === targetEmployeeId && e.companyId === resourceCompanyId);

            if (!hasOwnership) {
                throw new ForbiddenException('You do not have permission to delete this file.');
            }
        }

        await this.storageService.deleteFile(key);
        return { message: 'File deleted successfully' };
    }
}
