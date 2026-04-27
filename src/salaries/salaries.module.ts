import { Module } from '@nestjs/common';
import { SalariesController } from './salaries.controller';
import { SalariesService } from './salaries.service';
import { SalaryEngineService } from './services/salary-engine.service';
import { SalaryAutomationService } from './services/salary-automation.service';
import { PoliciesModule } from '../policies/policies.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { AdvancesModule } from '../advances/advances.module';
import { SalaryValidationService } from './services/salary-validation.service';
import { SalaryOvertimeService } from './services/salary-overtime.service';
import { SalaryComponentService } from './services/salary-component.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PoliciesModule, AttendanceModule, AdvancesModule, BillingModule],
  controllers: [SalariesController],
  providers: [
    SalariesService,
    SalaryEngineService,
    SalaryAutomationService,
    SalaryValidationService,
    SalaryOvertimeService,
    SalaryComponentService,
  ],
  exports: [SalariesService, SalaryEngineService, SalaryAutomationService],
})
export class SalariesModule {}
