import { Module } from '@nestjs/common';
import {
    AttendanceManualController,
    AttendanceExternalController,
} from './attendance.controller';
import { ShiftSelectionService } from './services/shift-selection.service';
import { AttendanceCalculationService } from './services/attendance-calculation.service';
import { AttendanceProcessingService } from './services/attendance-processing.service';
import { LeaveIntegrationService } from './services/leave-integration.service';
import { SessionGroupingService } from './services/session-grouping.service';
import { AttendanceExternalService } from './services/attendance-external.service';
import { AttendanceManualService } from './services/attendance-manual.service';
import { AttendanceQueryService } from './services/attendance-query.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PoliciesModule } from '../policies/policies.module';

@Module({
    imports: [PrismaModule, PoliciesModule],
    controllers: [AttendanceManualController, AttendanceExternalController],
    providers: [
        ShiftSelectionService,
        AttendanceCalculationService,
        AttendanceProcessingService,
        LeaveIntegrationService,
        SessionGroupingService,
        AttendanceExternalService,
        AttendanceManualService,
        AttendanceQueryService,
    ],
    exports: [
        AttendanceProcessingService,
        AttendanceExternalService,
        AttendanceManualService,
        AttendanceQueryService,
    ],
})
export class AttendanceModule { }
