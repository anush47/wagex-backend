import { Module } from '@nestjs/common';
import { AttendanceManualController, AttendanceExternalController } from './attendance.controller';
import { AttendancePortalController } from './attendance-portal.controller';
import { AttendancePortalService } from './services/attendance-portal.service';
import { ShiftSelectionService } from './services/shift-selection.service';
import { AttendanceCalculationService } from './services/attendance-calculation.service';
import { AttendanceProcessingService } from './services/attendance-processing.service';
import { LeaveIntegrationService } from './services/leave-integration.service';
import { SessionGroupingService } from './services/session-grouping.service';
import { AttendanceExternalService } from './services/attendance-external.service';
import { AttendanceManualService } from './services/attendance-manual.service';
import { AttendanceQueryService } from './services/attendance-query.service';
import { PoliciesModule } from '../policies/policies.module';
import { TimeService } from './services/time.service';
import { AttendanceWorkTimeService } from './services/attendance-work-time.service';
import { AttendanceStatusService } from './services/attendance-status.service';
import { AttendanceHolidayService } from './services/attendance-holiday.service';

@Module({
  imports: [PoliciesModule],
  controllers: [AttendanceManualController, AttendanceExternalController, AttendancePortalController],
  providers: [
    ShiftSelectionService,
    AttendanceCalculationService,
    AttendanceProcessingService,
    LeaveIntegrationService,
    SessionGroupingService,
    AttendanceExternalService,
    AttendancePortalService,
    AttendanceManualService,
    AttendanceQueryService,
    TimeService,
    AttendanceWorkTimeService,
    AttendanceStatusService,
    AttendanceHolidayService,
  ],
  exports: [AttendanceProcessingService, AttendanceExternalService, AttendanceManualService, AttendanceQueryService],
})
export class AttendanceModule {}
