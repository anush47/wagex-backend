import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, Query, Request, ForbiddenException } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Permission } from '../auth/permissions';
import { Permissions } from '../auth/permissions.decorator';
import { Logger } from '@nestjs/common';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // RolesGuard and PermissionsGuard are global
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

  @Get()
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @Permissions(Permission.MANAGE_EMPLOYEES)
  @ApiOperation({ summary: 'List employees' })
  @ApiResponse({ status: 200, description: 'Return employees.' })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  findAll(@Query('companyId') companyId: string, @Request() req) {
    const user = req.user;

    // If Admin, allow any companyId or none (all)
    if (user.role === Role.ADMIN) {
      return this.employeesService.findAll(companyId);
    }

    // Role.EMPLOYER Enforcement
    if (user.role === Role.EMPLOYER) {
      // If specific company requested, verify ownership
      if (companyId) {
        const hasAccess = user.memberships?.some((m) => m.companyId === companyId);
        if (!hasAccess) {
          throw new ForbiddenException('You do not have access to this company.');
        }
        return this.employeesService.findAll(companyId);
      }

      // If no companyId, default to the first company they have access to
      if (!user.memberships || user.memberships.length === 0) {
        return [];
      }

      return this.employeesService.findAll(user.memberships[0].companyId);
    }

    return [];
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
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @ApiOperation({ summary: 'Update employee' })
  @ApiResponse({ status: 200, description: 'Employee updated.' })
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Request() req,
  ) {
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

      // If they are trying to change the companyId, verify access to the NEW company too
      if (
        updateEmployeeDto.companyId &&
        updateEmployeeDto.companyId !== employee.companyId
      ) {
        const hasNewAccess = user.memberships?.some(
          (m) => m.companyId === updateEmployeeDto.companyId,
        );
        if (!hasNewAccess) {
          throw new ForbiddenException(
            'You do not have access to the target company.',
          );
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
}
