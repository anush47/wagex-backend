import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { EtfService } from '../services/etf.service';
import { CreateEtfDto, EtfQueryDto, GenerateEtfDto, UpdateEtfDto } from '../dto/etf.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BillingPeriodGuard } from '../../billing/guards/billing-period.guard';
import { RequiresBilling } from '../../billing/decorators/require-billing.decorator';

@ApiTags('ETF')
@Controller('companies')
export class EtfController {
  constructor(private readonly etfService: EtfService) {}

  @Post(':companyId/etf/preview')
  @UseGuards(BillingPeriodGuard)
  @RequiresBilling({ companyIdPath: 'params.companyId', kind: 'monthYear', monthPath: 'body.month', yearPath: 'body.year' })
  @ApiOperation({ summary: 'Generate ETF preview' })
  generatePreview(@Param('companyId') companyId: string, @Body() dto: GenerateEtfDto) {
    return this.etfService.generatePreview({ ...dto, companyId });
  }

  @Post(':companyId/etf')
  @UseGuards(BillingPeriodGuard)
  @RequiresBilling({ companyIdPath: 'params.companyId', kind: 'monthYear', monthPath: 'body.month', yearPath: 'body.year' })
  @ApiOperation({ summary: 'Create ETF record' })
  create(@Param('companyId') companyId: string, @Body() dto: CreateEtfDto) {
    return this.etfService.create({ ...dto, companyId } as any);
  }

  @Get(':companyId/etf')
  @ApiOperation({ summary: 'Get all ETF records' })
  findAll(@Param('companyId') companyId: string, @Query() query: EtfQueryDto) {
    return this.etfService.findAll({ ...query, companyId });
  }

  @Get(':companyId/etf/:id')
  @ApiOperation({ summary: 'Get ETF record by ID' })
  findOne(@Param('id') id: string) {
    return this.etfService.findOne(id);
  }

  @Patch(':companyId/etf/:id')
  @ApiOperation({ summary: 'Update ETF record' })
  update(@Param('id') id: string, @Body() dto: UpdateEtfDto) {
    return this.etfService.update(id, dto);
  }

  @Delete(':companyId/etf/:id')
  @ApiOperation({ summary: 'Delete ETF record' })
  remove(@Param('id') id: string) {
    return this.etfService.delete(id);
  }
}
