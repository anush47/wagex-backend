import { Module } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { TemplatesDataService } from './templates-data.service';

import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [TemplatesController],
  providers: [TemplatesService, TemplatesDataService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
