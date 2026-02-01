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
    @Roles(Role.ADMIN, Role.EMPLOYER)
    @Permissions(Permission.MANAGE_COMPANY)
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: UploadFileDto })
    @ApiOperation({ summary: 'Upload file' })
    @ApiResponse({ status: 201, type: FileUploadResponseDto })
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: UploadFileDto,
        @Query('companyId') queryCompanyId: string,
    ): Promise<FileUploadResponseDto> {
        // Resolve companyId
        const companyId = queryCompanyId || body.companyId;

        if (!file) {
            throw new BadRequestException('File is required');
        }
        if (!companyId) {
            throw new BadRequestException('companyId is required');
        }

        return this.storageService.uploadFile(file, companyId, body.folder);
    }

    @Get('url')
    @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
    @Permissions(Permission.VIEW_COMPANY)
    @ApiOperation({ summary: 'Get signed URL' })
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
                // Employees can only read from specific public folders
                if (!ALLOWED_EMPLOYEE_FOLDERS.includes(resourceFolder)) {
                    throw new ForbiddenException('You do not have permission to access private files.');
                }
            }
        }

        return {
            url: await this.storageService.getSignedUrl(key)
        };
    }
}
