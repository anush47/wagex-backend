import { Module } from '@nestjs/common';
import { SalariesController } from './salaries.controller';
import { SalariesService } from './salaries.service';
import { SalaryEngineService } from './services/salary-engine.service';
import { SalaryAutomationService } from './services/salary-automation.service';
import { PoliciesModule } from '../policies/policies.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { AdvancesModule } from '../advances/advances.module';

@Module({
    imports: [PoliciesModule, AttendanceModule, AdvancesModule],
    controllers: [SalariesController],
    providers: [SalariesService, SalaryEngineService, SalaryAutomationService],
    exports: [SalariesService, SalaryEngineService, SalaryAutomationService],
})
export class SalariesModule { }
