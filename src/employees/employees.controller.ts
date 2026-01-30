import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, Query } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) { }

  @Post()
  @Roles(Role.ADMIN, Role.EMPLOYER) // Admins or Employers can create employees
  @ApiOperation({ summary: 'Create employee' })
  @ApiResponse({ status: 201, description: 'Employee created.' })
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    // TODO: For EMPLOYER, enforce createEmployeeDto.companyId === user.companyId
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @ApiOperation({ summary: 'List employees' })
  @ApiResponse({ status: 200, description: 'Return employees.' })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  findAll(@Query('companyId') companyId?: string) {
    // TODO: If role is EMPLOYER, force override companyId to their own
    return this.employeesService.findAll(companyId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiResponse({ status: 200, description: 'Return employee.' })
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @ApiOperation({ summary: 'Update employee' })
  @ApiResponse({ status: 200, description: 'Employee updated.' })
  update(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @ApiOperation({ summary: 'Delete employee' })
  @ApiResponse({ status: 200, description: 'Employee deleted.' })
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}
