import { Module } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { TemplatesDataService } from './templates-data.service';

@Module({
  controllers: [TemplatesController],
  providers: [TemplatesService, TemplatesDataService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
