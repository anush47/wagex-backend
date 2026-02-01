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
    @ApiOperation({ summary: 'Create a policy. INFO: You must provide "companyId" in the body for permission validation.' })
    create(@Body() createPolicyDto: CreatePolicyDto) {
        return this.policiesService.create(createPolicyDto);
    }

    @Get('company/:companyId')
    @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
    @Permissions(Permission.VIEW_COMPANY)
    @ApiOperation({ summary: 'Get the default policy for a company' })
    findByCompany(@Param('companyId') companyId: string) {
        return this.policiesService.findByCompany(companyId);
    }

    @Get('effective/:employeeId')
    @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
    @Permissions(Permission.VIEW_COMPANY) // Basic permission
    @ApiOperation({ summary: 'Get the effective policy with source details (Effective, Company, Override)' })
    getEffective(@Param('employeeId') employeeId: string) {
        return this.policiesService.getEffectivePolicyDetail(employeeId);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.EMPLOYER)
    @Permissions(Permission.MANAGE_COMPANY)
    @ApiOperation({ summary: 'Update a policy (Requires companyId in query)' })
    update(@Param('id') id: string, @Query('companyId') companyId: string, @Body() updatePolicyDto: UpdatePolicyDto) {
        return this.policiesService.update(id, updatePolicyDto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.EMPLOYER)
    @Permissions(Permission.MANAGE_COMPANY)
    @ApiOperation({ summary: 'Delete a policy by ID (Requires companyId in query)' })
    remove(@Param('id') id: string, @Query('companyId') companyId: string) {
        return this.policiesService.remove(id);
    }

    @Delete('override/:employeeId')
    @Roles(Role.ADMIN, Role.EMPLOYER)
    @Permissions(Permission.MANAGE_COMPANY)
    @ApiOperation({ summary: 'Remove an override policy for an employee (Requires companyId in query)' })
    removeOverride(@Param('employeeId') employeeId: string, @Query('companyId') companyId: string) {
        return this.policiesService.removeByEmployee(employeeId);
    }
}
