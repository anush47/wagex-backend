import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';

@ApiTags('Policies')
@ApiBearerAuth()
@Controller('policies')
export class PoliciesController {
    constructor(private readonly policiesService: PoliciesService) { }

    @Post()
    @Roles(Role.ADMIN, Role.EMPLOYER)
    @Permissions(Permission.MANAGE_COMPANY)
    @ApiOperation({ summary: 'Create policy template' })
    create(@Body() createPolicyDto: CreatePolicyDto) {
        return this.policiesService.create(createPolicyDto);
    }

    @Get('company/:companyId')
    @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
    @Permissions(Permission.VIEW_COMPANY)
    @ApiOperation({ summary: 'Get all company policies' })
    findByCompany(@Param('companyId') companyId: string) {
        return this.policiesService.findByCompany(companyId);
    }

    @Get('company/:companyId/default')
    @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
    @Permissions(Permission.VIEW_COMPANY)
    @ApiOperation({ summary: 'Get company default policy' })
    getDefault(@Param('companyId') companyId: string) {
        return this.policiesService.getDefaultPolicy(companyId);
    }

    @Get('effective/:employeeId')
    @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
    @Permissions(Permission.VIEW_COMPANY)
    @ApiOperation({ summary: 'Get effective employee policy (Merged structure)' })
    getEffective(@Param('employeeId') employeeId: string) {
        return this.policiesService.getEffectivePolicyDetail(employeeId);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.EMPLOYER)
    @Permissions(Permission.MANAGE_COMPANY)
    @ApiOperation({ summary: 'Update policy template' })
    update(@Param('id') id: string, @Body() updatePolicyDto: UpdatePolicyDto) {
        return this.policiesService.update(id, updatePolicyDto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.EMPLOYER)
    @Permissions(Permission.MANAGE_COMPANY)
    @ApiOperation({ summary: 'Delete policy' })
    remove(@Param('id') id: string) {
        return this.policiesService.remove(id);
    }
}
