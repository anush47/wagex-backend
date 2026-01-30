import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, Request, ForbiddenException, Logger } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Permission } from '../auth/permissions';
import { Permissions } from '../auth/permissions.decorator';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // RolesGuard and PermissionsGuard are global
@Controller('companies')
export class CompaniesController {
  private readonly logger = new Logger(CompaniesController.name);

  constructor(private readonly companiesService: CompaniesService) { }

  @Post()
  @Roles(Role.ADMIN) // Only system admins create companies
  @ApiOperation({ summary: 'Create company' })
  @ApiResponse({ status: 201, description: 'Company created.' })
  async create(@Body() createCompanyDto: CreateCompanyDto) {
    this.logger.log(`Admin creating company: ${createCompanyDto.name}`);
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all companies' })
  @ApiResponse({ status: 200, description: 'Return all companies.' })
  async findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @Permissions(Permission.VIEW_COMPANY)
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiResponse({ status: 200, description: 'Return company.' })
  async findOne(@Param('id') id: string, @Request() req) {
    const user = req.user;

    // Tenancy Check for Employer
    if (user.role === Role.EMPLOYER) {
      const hasAccess = user.memberships?.some(m => m.companyId === id);
      if (!hasAccess) {
        this.logger.warn(`Unauthorized company access attempt by user ${user.id} for company ${id}`);
        throw new ForbiddenException('You do not have access to this company.');
      }
    }

    return this.companiesService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @Permissions(Permission.EDIT_COMPANY)
  @ApiOperation({ summary: 'Update company' })
  @ApiResponse({ status: 200, description: 'Company updated.' })
  async update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto, @Request() req) {
    const user = req.user;

    // Tenancy Check for Employer
    if (user.role === Role.EMPLOYER) {
      const hasAccess = user.memberships?.some(m => m.companyId === id);
      if (!hasAccess) {
        this.logger.warn(`Unauthorized company update attempt by user ${user.id} for company ${id}`);
        throw new ForbiddenException('You do not have access to this company.');
      }
    }

    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete company' })
  @ApiResponse({ status: 200, description: 'Company deleted.' })
  async remove(@Param('id') id: string) {
    this.logger.log(`Admin deleting company: ${id}`);
    return this.companiesService.remove(id);
  }
}
