import { Controller, Get, Post, Body, Query, Param, Request, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SalariesService } from './salaries.service';
import { GenerateSalaryDto, SalaryQueryDto } from './dto/salary.dto';
import * as RequestWithUserNamespace from '../common/interfaces/request-with-user.interface';
import { SalaryGroupPreview, SalaryPreview } from './interfaces/salary-calculation.interface';
import { BillingPeriodGuard } from '../billing/guards/billing-period.guard';
import { RequiresBilling } from '../billing/decorators/require-billing.decorator';

@ApiTags('salaries')
@Controller('salaries')
export class SalariesController {
  constructor(private readonly salariesService: SalariesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current employee salaries' })
  findMySalaries(@Query() query: SalaryQueryDto, @Request() req: RequestWithUserNamespace.RequestWithUser) {
    return this.salariesService.findMySalaries(req.user.id, query);
  }

  @Post('generate-preview')
  @UseGuards(BillingPeriodGuard)
  @RequiresBilling({ companyIdPath: 'body.companyId', kind: 'date', periodEndPath: 'body.periodEndDate' })
  @ApiOperation({ summary: 'Generate salary previews without saving' })
  generatePreview(@Body() dto: GenerateSalaryDto) {
    return this.salariesService.generatePreviews(dto);
  }

  @Post('save-drafts/:companyId')
  @UseGuards(BillingPeriodGuard)
  @RequiresBilling({ companyIdPath: 'params.companyId', kind: 'date', periodEndPath: 'body.0.employees.0.periodEndDate' })
  @ApiOperation({ summary: 'Save generated salary previews as drafts' })
  saveDrafts(@Param('companyId') companyId: string, @Body() groupedPreviews: SalaryGroupPreview[]) {
    return this.salariesService.saveDrafts(companyId, groupedPreviews);
  }

  @Get()
  @ApiOperation({ summary: 'Get all salaries with filtering' })
  findAll(@Query() query: SalaryQueryDto) {
    return this.salariesService.findAll(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get salary payment summary (pending, overdue, disbursed this month)' })
  getSummary(@Query('companyId') companyId: string) {
    return this.salariesService.getSummary(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get salary by ID' })
  findOne(@Param('id') id: string) {
    return this.salariesService.findOne(id);
  }

  @Post(':id')
  @ApiOperation({ summary: 'Update salary' })
  update(@Param('id') id: string, @Body() data: Partial<SalaryPreview> & { sessionIds?: string[] }) {
    return this.salariesService.update(id, data);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve salary' })
  approve(@Param('id') id: string, @Request() req: RequestWithUserNamespace.RequestWithUser) {
    const userId = req.user.id;
    return this.salariesService.approve(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete salary' })
  delete(@Param('id') id: string) {
    return this.salariesService.delete(id);
  }
}
