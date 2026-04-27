import { Module } from '@nestjs/common';
import { BillingConfigService } from './services/billing-config.service';
import { InvoiceService } from './services/invoice.service';
import { BillingStatusService } from './services/billing-status.service';
import { AdminBillingController } from './controllers/admin-billing.controller';
import { EmployerBillingController } from './controllers/employer-billing.controller';
import { BillingGuard } from './guards/billing.guard';
import { BillingPeriodGuard } from './guards/billing-period.guard';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [AdminBillingController, EmployerBillingController],
  providers: [BillingConfigService, InvoiceService, BillingStatusService, BillingGuard, BillingPeriodGuard],
  exports: [BillingConfigService, InvoiceService, BillingStatusService, BillingGuard, BillingPeriodGuard],
})
export class BillingModule {}
