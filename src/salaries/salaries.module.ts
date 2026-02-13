import { Module } from '@nestjs/common';
import { SalariesController } from './salaries.controller';
import { SalariesService } from './salaries.service';
import { SalaryEngineService } from './services/salary-engine.service';
import { PoliciesModule } from '../policies/policies.module';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
    imports: [PoliciesModule, AttendanceModule],
    controllers: [SalariesController],
    providers: [SalariesService, SalaryEngineService],
    exports: [SalariesService, SalaryEngineService],
})
export class SalariesModule { }
