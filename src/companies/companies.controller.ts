import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) { }

  @Post()
  @Roles(Role.ADMIN) // Only system admins create companies
  @ApiOperation({ summary: 'Create company' })
  @ApiResponse({ status: 201, description: 'Company created.' })
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List companies' })
  @ApiResponse({ status: 200, description: 'Return all companies.' })
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EMPLOYER) // Employer can see own company
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiResponse({ status: 200, description: 'Return company.' })
  findOne(@Param('id') id: string) {
    // In real app, check if user.companyId === id for EMPLOYER role
    return this.companiesService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN) // Maybe Employer too?
  @ApiOperation({ summary: 'Update company' })
  @ApiResponse({ status: 200, description: 'Company updated.' })
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete company' })
  @ApiResponse({ status: 200, description: 'Company deleted.' })
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }
}
