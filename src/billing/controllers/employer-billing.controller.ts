import {
  Controller, Get, Post, Body, Query, Request,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '@prisma/client';
import { BillingConfigService } from '../services/billing-config.service';
import { InvoiceService } from '../services/invoice.service';
import { BillingStatusService } from '../services/billing-status.service';
import { CreateInvoicesDto } from '../dto/billing.dto';
import { StorageService } from '../../storage/storage.service';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@ApiTags('Employer Billing')
@ApiBearerAuth()
@Controller('billing')
@Roles(Role.EMPLOYER)
export class EmployerBillingController {
  constructor(
    private readonly configService: BillingConfigService,
    private readonly invoiceService: InvoiceService,
    private readonly statusService: BillingStatusService,
    private readonly storageService: StorageService,
  ) {}

  @Get('config')
  getConfig(@Query('companyId') companyId: string) {
    return this.configService.getForCompany(companyId);
  }

  @Get('status')
  getStatus(@Query('companyId') companyId: string) {
    return this.statusService.getStatus(companyId);
  }

  @Get('invoices')
  getInvoices(@Query('companyId') companyId: string) {
    return this.invoiceService.getInvoicesForCompany(companyId);
  }

  @Post('invoices/preview')
  previewPrice(@Body() dto: CreateInvoicesDto) {
    return this.invoiceService.previewPrice(dto.companyId, dto.billingPeriods);
  }

  @Post('invoices')
  createInvoices(@Body() dto: CreateInvoicesDto, @Request() req: { user: RequestWithUser['user'] }) {
    return this.invoiceService.createInvoices(dto.companyId, dto.billingPeriods, req.user.id);
  }

  @Post('invoices/slip')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSlip(
    @UploadedFile() file: Express.Multer.File,
    @Body('companyId') companyId: string,
    @Body('invoiceIds') invoiceIdsRaw: string,
    @Request() req: { user: RequestWithUser['user'] },
  ) {
    if (!file) throw new BadRequestException('File is required');
    const invoiceIds = JSON.parse(invoiceIdsRaw);
    const { key } = await this.storageService.uploadFile(file, companyId, 'billing');
    return this.invoiceService.uploadSlip(companyId, invoiceIds, key, req.user.id);
  }
}
