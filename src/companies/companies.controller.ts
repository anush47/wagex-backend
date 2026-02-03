import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, Request, ForbiddenException, Logger, Query } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Permission } from '../auth/permissions';
import { Permissions } from '../auth/permissions.decorator';
import { QueryDto } from '../common/dto/query.dto';

@ApiTags('Companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  private readonly logger = new Logger(CompaniesController.name);

  constructor(private readonly companiesService: CompaniesService) { }

  @Post()
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @ApiOperation({ summary: 'Create company' })
  @ApiResponse({ status: 201, description: 'Company created.' })
  async create(@Body() createCompanyDto: CreateCompanyDto, @Request() req) {
    const user = req.user;
    this.logger.log(`${user.role} creating company: ${createCompanyDto.name}`);

    // If employer, automatically add them as a member
    if (user.role === Role.EMPLOYER) {
      return this.companiesService.createWithMembership(createCompanyDto, user.id);
    }

    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @ApiOperation({ summary: 'List companies' })
  @ApiResponse({ status: 200, description: 'Return companies (all for admin, own for employer).' })
  async findAll(@Request() req, @Query() queryDto: QueryDto) {
    const user = req.user;

    // Admin sees all companies
    if (user.role === Role.ADMIN) {
      return this.companiesService.findAll(queryDto);
    }

    // Employer sees only their companies
    if (user.role === Role.EMPLOYER) {
      const companyIds = user.memberships?.map(m => m.companyId) || [];
      return this.companiesService.findByIds(companyIds, queryDto);
    }

    return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
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
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @Permissions(Permission.MANAGE_COMPANY)
  @ApiOperation({ summary: 'Delete company' })
  @ApiResponse({ status: 200, description: 'Company deleted.' })
  async remove(@Param('id') id: string, @Request() req) {
    const user = req.user;

    // Tenancy Check for Employer
    if (user.role === Role.EMPLOYER) {
      const hasAccess = user.memberships?.some(m => m.companyId === id);
      if (!hasAccess) {
        this.logger.warn(`Unauthorized company delete attempt by user ${user.id} for company ${id}`);
        throw new ForbiddenException('You do not have access to this company.');
      }
    }

    this.logger.log(`${user.role} deleting company: ${id}`);
    return this.companiesService.remove(id);
  }
}
