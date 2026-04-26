import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
@Module({
  imports: [],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
