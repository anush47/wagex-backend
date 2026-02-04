import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException, Query } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { QueryDto } from '../common/dto/query.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) { }

  @Post()
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @Permissions(Permission.MANAGE_COMPANY)
  @ApiOperation({ summary: 'Create department' })
  @ApiResponse({ status: 201, description: 'Department created.' })
  async create(@Body() createDepartmentDto: CreateDepartmentDto, @Request() req) {
    const user = req.user;

    // Tenancy Check
    if (user.role === Role.EMPLOYER) {
      const hasAccess = user.memberships?.some(m => m.companyId === createDepartmentDto.companyId);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this company.');
      }
    }

    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'List departments' })
  @ApiResponse({ status: 200, description: 'Return all departments for company.' })
  @ApiQuery({ name: 'companyId', required: true, type: String })
  async findAll(@Query('companyId') companyId: string, @Request() req) {
    const user = req.user;

    // Tenancy Check
    if (user.role !== Role.ADMIN) {
      // Employer or Employee must belong to the company
      const hasAccess = user.memberships?.some(m => m.companyId === companyId);
      // For employees, we might need to check their employment record if memberships are not synced for all employees yet
      // But assuming memberships are the source of truth for access:
      if (!hasAccess) {
        // Fallback: check if they are an employee of this company (if membership is strictly for portal access)
        // For now strict membership check is safer
        throw new ForbiddenException('You do not have access to this company.');
      }
    }

    return this.departmentsService.findAll(companyId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get department details' })
  async findOne(@Param('id') id: string, @Request() req) {
    const dept = await this.departmentsService.findOne(id);
    const user = req.user;

    // Tenancy Check
    if (user.role !== Role.ADMIN) {
      const hasAccess = user.memberships?.some(m => m.companyId === dept.companyId);
      if (!hasAccess) throw new ForbiddenException('Access denied');
    }

    return dept;
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @Permissions(Permission.MANAGE_COMPANY)
  @ApiOperation({ summary: 'Update department' })
  async update(@Param('id') id: string, @Body() updateDepartmentDto: UpdateDepartmentDto, @Request() req) {
    // We need to fetch existing to check company ownership
    const dept = await this.departmentsService.findOne(id);
    const user = req.user;

    if (user.role === Role.EMPLOYER) {
      const hasAccess = user.memberships?.some(m => m.companyId === dept.companyId);
      if (!hasAccess) throw new ForbiddenException('Access denied');

      // If changing companyId (rare), check target too
      if (updateDepartmentDto.companyId && updateDepartmentDto.companyId !== dept.companyId) {
        const targetAccess = user.memberships?.some(m => m.companyId === updateDepartmentDto.companyId);
        if (!targetAccess) throw new ForbiddenException('Access denied to target company');
      }
    }

    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @Permissions(Permission.MANAGE_COMPANY)
  @ApiOperation({ summary: 'Delete department' })
  async remove(@Param('id') id: string, @Request() req) {
    const dept = await this.departmentsService.findOne(id);
    const user = req.user;

    if (user.role === Role.EMPLOYER) {
      const hasAccess = user.memberships?.some(m => m.companyId === dept.companyId);
      if (!hasAccess) throw new ForbiddenException('Access denied');
    }

    return this.departmentsService.remove(id);
  }
}
