import { Module } from '@nestjs/common';
import {
    AttendanceManualController,
    AttendanceExternalController,
} from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { ShiftSelectionService } from './services/shift-selection.service';
import { AttendanceCalculationService } from './services/attendance-calculation.service';
import { AttendanceProcessingService } from './services/attendance-processing.service';
import { LeaveIntegrationService } from './services/leave-integration.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AttendanceManualController, AttendanceExternalController],
    providers: [
        AttendanceService,
        ShiftSelectionService,
        AttendanceCalculationService,
        AttendanceProcessingService,
        LeaveIntegrationService,
    ],
    exports: [AttendanceService, AttendanceProcessingService],
})
export class AttendanceModule { }
