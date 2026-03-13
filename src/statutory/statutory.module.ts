import { Module } from '@nestjs/common';
import { EpfService } from './services/epf.service';
import { EtfService } from './services/etf.service';
import { EpfController } from './controllers/epf.controller';
import { EtfController } from './controllers/etf.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EpfController, EtfController],
  providers: [EpfService, EtfService],
  exports: [EpfService, EtfService],
})
export class StatutoryModule {}
