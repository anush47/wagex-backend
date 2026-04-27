import { Module } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { TemplatesDataService } from './templates-data.service';

import { StorageModule } from '../storage/storage.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [StorageModule, BillingModule],
  controllers: [TemplatesController],
  providers: [TemplatesService, TemplatesDataService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
