import { Module } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { LeavesController } from './leaves.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PoliciesModule } from '../policies/policies.module';

@Module({
    imports: [PrismaModule, PoliciesModule],
    controllers: [LeavesController],
    providers: [LeavesService],
    exports: [LeavesService]
})
export class LeavesModule { }
