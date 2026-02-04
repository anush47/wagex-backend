import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, Query, Request, ForbiddenException, Logger } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Permission } from '../auth/permissions';
import { Permissions } from '../auth/permissions.decorator';
import { QueryDto } from '../common/dto/query.dto';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  private readonly logger = new Logger(EmployeesController.name);

  constructor(private readonly employeesService: EmployeesService) { }

  @Post()
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @Permissions(Permission.MANAGE_EMPLOYEES)
  @ApiOperation({ summary: 'Create employee' })
  @ApiResponse({ status: 201, description: 'Employee created.' })
  async create(@Body() createEmployeeDto: CreateEmployeeDto, @Request() req) {
    const user = req.user;

    // Tenancy Check for Employer
    if (user.role === Role.EMPLOYER) {
      const hasAccess = user.memberships?.some(
        (m) => m.companyId === createEmployeeDto.companyId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this company.');
      }
    }

    return this.employeesService.create(createEmployeeDto);
  }

  @Get('me')
  @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get current employee profile' })
  @ApiResponse({ status: 200, description: 'Return current employee.' })
  async getMe(@Request() req) {
    return this.employeesService.findMe(req.user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @Permissions(Permission.MANAGE_EMPLOYEES)
  @ApiOperation({ summary: 'List employees' })
  @ApiResponse({ status: 200, description: 'Return employees.' })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  findAll(@Query() queryDto: QueryDto, @Request() req) {
    return this.employeesService.findAll(queryDto.companyId, queryDto, req.user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiResponse({ status: 200, description: 'Return employee.' })
  async findOne(@Param('id') id: string, @Request() req) {
    const user = req.user;
    const employee = await this.employeesService.findOne(id);

    // Tenancy Check: Ensure employer owns this employee's company
    if (user.role === Role.EMPLOYER) {
      const hasAccess = user.memberships?.some(
        (m) => m.companyId === employee.companyId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this employee.');
      }
    }

    return employee;
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.EMPLOYER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Update employee' })
  @ApiResponse({ status: 200, description: 'Employee updated.' })
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Request() req,
  ) {
    const user = req.user;
    const employee = await this.employeesService.findOne(id);

    // Tenancy & Permission Checks
    if (user.role === Role.EMPLOYER) {
      const hasAccess = user.memberships?.some(
        (m) => m.companyId === employee.companyId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this employee.');
      }
    } else if (user.role === Role.EMPLOYEE) {
      // Employee self-update check
      if (employee.userId !== user.id) {
        throw new ForbiddenException('You can only update your own profile.');
      }
      if (!employee.canSelfEdit) {
        throw new ForbiddenException('Self-editing is disabled for your account.');
      }

      // Restrict fields for employees (prevent them from changing salary, status, etc.)
      const restrictedFields = ['basicSalary', 'status', 'employeeNo', 'companyId', 'userId', 'canSelfEdit'];
      for (const field of restrictedFields) {
        if (updateEmployeeDto[field] !== undefined) {
          throw new ForbiddenException(`You are not allowed to modify the field: ${field}`);
        }
      }
    }

    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @Permissions(Permission.MANAGE_EMPLOYEES)
  @ApiOperation({ summary: 'Delete employee' })
  @ApiResponse({ status: 200, description: 'Employee deleted.' })
  async remove(@Param('id') id: string, @Request() req) {
    const user = req.user;
    const employee = await this.employeesService.findOne(id);

    // Tenancy Check
    if (user.role === Role.EMPLOYER) {
      const hasAccess = user.memberships?.some(
        (m) => m.companyId === employee.companyId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this employee.');
      }
    }

    return this.employeesService.remove(id);
  }

  @Post(':id/provision-user')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @Permissions(Permission.MANAGE_EMPLOYEES)
  @ApiOperation({ summary: 'Provision user account for employee' })
  @ApiResponse({ status: 201, description: 'User created/linked.' })
  async provisionUser(@Param('id') id: string, @Request() req) {
    // 1. Verify Access
    const user = req.user;
    const employee = await this.employeesService.findOne(id);

    if (user.role === Role.EMPLOYER) {
      const hasAccess = user.memberships?.some(m => m.companyId === employee.companyId);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this employee.');
      }
    }

    // 2. Provision
    return this.employeesService.provisionUser(id);
  }

  @Delete(':id/provision-user')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @Permissions(Permission.MANAGE_EMPLOYEES)
  @ApiOperation({ summary: 'Unlink user account from employee' })
  @ApiResponse({ status: 200, description: 'User unlinked.' })
  async deprovisionUser(@Param('id') id: string, @Request() req) {
    const user = req.user;
    const employee = await this.employeesService.findOne(id);

    if (user.role === Role.EMPLOYER) {
      const hasAccess = user.memberships?.some(m => m.companyId === employee.companyId);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this employee.');
      }
    }

    return this.employeesService.deprovisionUser(id);
  }
}
