import {
  Controller, Get, Post, Patch, Body, Param, Query, Request,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '@prisma/client';
import { BillingConfigService } from '../services/billing-config.service';
import { InvoiceService } from '../services/invoice.service';
import { BillingStatusService } from '../services/billing-status.service';
import { UpdateBillingConfigDto, ReviewInvoiceDto } from '../dto/billing.dto';
import { StorageService } from '../../storage/storage.service';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('Admin Billing')
@ApiBearerAuth()
@Controller('admin/billing')
@Roles(Role.ADMIN)
export class AdminBillingController {
  constructor(
    private readonly configService: BillingConfigService,
    private readonly invoiceService: InvoiceService,
    private readonly statusService: BillingStatusService,
    private readonly storageService: StorageService,
  ) {}

  @Get('default')
  getDefault() { return this.configService.getDefault(); }

  @Patch('default')
  updateDefault(@Body() dto: UpdateBillingConfigDto) { return this.configService.updateDefault(dto); }

  @Get('companies')
  listAll() { return this.configService.listAll(); }

  @Get('companies/:companyId')
  getForCompany(@Param('companyId') id: string) { return this.configService.getForCompany(id); }

  @Patch('companies/:companyId')
  updateForCompany(@Param('companyId') id: string, @Body() dto: UpdateBillingConfigDto) {
    return this.configService.update(id, dto);
  }

  @Post('companies/:companyId/create-custom')
  createCustomConfig(@Param('companyId') id: string) { return this.configService.createCustomForCompany(id); }

  @Post('companies/:companyId/recalculate')
  forceRecalculate(@Param('companyId') id: string) { return this.configService.forceRecalculate(id); }

  @Get('companies/:companyId/status')
  getStatus(@Param('companyId') id: string) { return this.statusService.getStatus(id); }

  @Get('invoices')
  getAllInvoices(
    @Query('companyId') companyId: string,
    @Query('status') status: string,
    @Query('period') period: string,
  ) {
    return this.invoiceService.getAllInvoices({ companyId, status, period });
  }

  @Post('invoices/review')
  reviewInvoices(@Body() dto: ReviewInvoiceDto, @Request() req: { user: RequestWithUser['user'] }) {
    return this.invoiceService.reviewInvoices(dto.invoiceIds, dto.approved, req.user.id, dto.rejectionReason);
  }

  @Patch('invoices/:id/status')
  setSpecialStatus(
    @Param('id') id: string,
    @Body('status') status: 'SKIPPED' | 'FREE',
    @Request() req: { user: RequestWithUser['user'] },
  ) {
    return this.invoiceService.setSpecialStatus(id, status, req.user.id);
  }

  @Post('invoices/slip')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSlipOnBehalf(
    @UploadedFile() file: Express.Multer.File,
    @Body('companyId') companyId: string,
    @Body('invoiceIds') invoiceIdsRaw: string,
    @Request() req: { user: RequestWithUser['user'] },
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!companyId) throw new BadRequestException('companyId is required');
    let invoiceIds: string[];
    try { invoiceIds = JSON.parse(invoiceIdsRaw); } catch { throw new BadRequestException('invoiceIds must be a valid JSON array'); }
    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) throw new BadRequestException('invoiceIds must be a non-empty array');
    const { key } = await this.storageService.uploadFile(file, companyId, 'billing');
    return this.invoiceService.uploadSlip(companyId, invoiceIds, key, req.user.id);
  }

  @Post('seed-default')
  seedDefault() { return this.configService.ensureDefaultExists(); }
}
