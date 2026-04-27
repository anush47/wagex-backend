import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { EpfService } from '../services/epf.service';
import { CreateEpfDto, EpfQueryDto, GenerateEpfDto, UpdateEpfDto } from '../dto/epf.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BillingPeriodGuard } from '../../billing/guards/billing-period.guard';
import { RequiresBilling } from '../../billing/decorators/require-billing.decorator';

@ApiTags('EPF')
@Controller('companies')
export class EpfController {
  constructor(private readonly epfService: EpfService) {}

  @Post(':companyId/epf/preview')
  @UseGuards(BillingPeriodGuard)
  @RequiresBilling({ companyIdPath: 'params.companyId', kind: 'monthYear', monthPath: 'body.month', yearPath: 'body.year' })
  @ApiOperation({ summary: 'Generate EPF preview' })
  generatePreview(@Param('companyId') companyId: string, @Body() dto: GenerateEpfDto) {
    return this.epfService.generatePreview({ ...dto, companyId });
  }

  @Post(':companyId/epf')
  @UseGuards(BillingPeriodGuard)
  @RequiresBilling({ companyIdPath: 'params.companyId', kind: 'monthYear', monthPath: 'body.month', yearPath: 'body.year' })
  @ApiOperation({ summary: 'Create EPF record' })
  create(@Param('companyId') companyId: string, @Body() dto: CreateEpfDto) {
    return this.epfService.create({ ...dto, companyId } as any);
  }

  @Get(':companyId/epf')
  @ApiOperation({ summary: 'Get all EPF records' })
  findAll(@Param('companyId') companyId: string, @Query() query: EpfQueryDto) {
    return this.epfService.findAll({ ...query, companyId });
  }

  @Get(':companyId/epf/:id')
  @ApiOperation({ summary: 'Get EPF record by ID' })
  findOne(@Param('id') id: string) {
    return this.epfService.findOne(id);
  }

  @Patch(':companyId/epf/:id')
  @ApiOperation({ summary: 'Update EPF record' })
  update(@Param('id') id: string, @Body() dto: UpdateEpfDto) {
    return this.epfService.update(id, dto);
  }

  @Delete(':companyId/epf/:id')
  @ApiOperation({ summary: 'Delete EPF record' })
  remove(@Param('id') id: string) {
    return this.epfService.delete(id);
  }
}
