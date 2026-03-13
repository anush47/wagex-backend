import { Module } from '@nestjs/common';
import { AdvancesService } from './advances.service';
import { AdvancesController } from './advances.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [PaymentsModule],
    controllers: [AdvancesController],
    providers: [AdvancesService],
    exports: [AdvancesService],
})
export class AdvancesModule { }
