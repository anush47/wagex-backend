import { Module } from '@nestjs/common';
import { CalendarsService } from './calendars.service';
import { CalendarsController } from './calendars.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CalendarsController],
    providers: [CalendarsService],
    exports: [CalendarsService]
})
export class CalendarsModule { }
