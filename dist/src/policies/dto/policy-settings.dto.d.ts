import { ShiftsConfigDto } from './shifts-policy.dto';
import { AttendanceConfigDto } from './attendance-policy.dto';
import { SalaryComponentsConfigDto } from './salary-components-policy.dto';
import { PayrollSettingsConfigDto } from './payroll-settings-policy.dto';
import { WorkingDaysConfigDto } from './working-days-policy.dto';
import { LeavesConfigDto } from './leaves-policy.dto';
export * from './shifts-policy.dto';
export * from './attendance-policy.dto';
export * from './salary-components-policy.dto';
export * from './payroll-settings-policy.dto';
export * from './working-days-policy.dto';
export * from './leaves-policy.dto';
export declare class PolicySettingsDto {
    shifts?: ShiftsConfigDto;
    attendance?: AttendanceConfigDto;
    salaryComponents?: SalaryComponentsConfigDto;
    payrollConfiguration?: PayrollSettingsConfigDto;
    workingDays?: WorkingDaysConfigDto;
    leaves?: LeavesConfigDto;
    calendarId?: string;
}
