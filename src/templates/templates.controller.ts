import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto, TemplateQueryDto } from './dto/template.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentType, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import * as RequestWithUserNamespace from '../common/interfaces/request-with-user.interface';

@ApiTags('Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new document template' })
  create(@Body() createTemplateDto: CreateTemplateDto, @Request() req: RequestWithUserNamespace.RequestWithUser) {
    return this.templatesService.create(createTemplateDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Find all templates' })
  findAll(@Query() query: TemplateQueryDto, @Request() req: RequestWithUserNamespace.RequestWithUser) {
    return this.templatesService.findAll(query, req.user);
  }

  @Get('variables/:type')
  @ApiOperation({ summary: 'Get available variables for a document type' })
  getVariables(@Param('type') type: DocumentType) {
    return this.templatesService.getVariables(type);
  }

  @Get('live-data/:type')
  @ApiOperation({ summary: 'Get live sample data for a document type' })
  getLiveData(
    @Param('type') type: DocumentType,
    @Query('resourceId') resourceId: string,
    @Request() req: RequestWithUserNamespace.RequestWithUser,
    @Query() query: any
  ) {
    return this.templatesService.getLiveData(type, resourceId, req.user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single template' })
  findOne(@Param('id') id: string, @Request() req: RequestWithUserNamespace.RequestWithUser) {
    return this.templatesService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a template' })
  update(@Param('id') id: string, @Body() updateTemplateDto: UpdateTemplateDto, @Request() req: RequestWithUserNamespace.RequestWithUser) {
    return this.templatesService.update(id, updateTemplateDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a template' })
  remove(@Param('id') id: string, @Request() req: RequestWithUserNamespace.RequestWithUser) {
    return this.templatesService.remove(id, req.user);
  }

  @Get('render/:templateId/:resourceId')
  @ApiOperation({ summary: 'Render a template with data' })
  render(
    @Param('templateId') templateId: string, 
    @Param('resourceId') resourceId: string,
    @Query() query: any
  ) {
    return this.templatesService.render(templateId, resourceId, query);
  }
}
