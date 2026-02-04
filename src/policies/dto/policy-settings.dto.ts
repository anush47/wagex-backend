import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { ShiftsConfigDto } from './shifts-policy.dto';
import { AttendanceConfigDto } from './attendance-policy.dto';
import { SalaryComponentsConfigDto } from './salary-components-policy.dto';
import { PayrollSettingsConfigDto } from './payroll-settings-policy.dto';
import { WorkingDaysConfigDto } from './working-days-policy.dto';
import { LeavesConfigDto } from './leaves-policy.dto';

// Re-exporting everything to maintain backward compatibility for imports
export * from './shifts-policy.dto';
export * from './attendance-policy.dto';
export * from './salary-components-policy.dto';
export * from './payroll-settings-policy.dto';
export * from './working-days-policy.dto';
export * from './leaves-policy.dto';

export class PolicySettingsDto {
    @ApiPropertyOptional({ type: ShiftsConfigDto, description: 'Shifts configuration' })
    @IsOptional()
    @ValidateNested()
    @Type(() => ShiftsConfigDto)
    shifts?: ShiftsConfigDto;

    @ApiPropertyOptional({ type: AttendanceConfigDto, description: 'Attendance tracking, geofencing, and approval rules' })
    @IsOptional()
    @ValidateNested()
    @Type(() => AttendanceConfigDto)
    attendance?: AttendanceConfigDto;

    @ApiPropertyOptional({ type: SalaryComponentsConfigDto, description: 'Salary components (additions/deductions) configuration' })
    @IsOptional()
    @ValidateNested()
    @Type(() => SalaryComponentsConfigDto)
    salaryComponents?: SalaryComponentsConfigDto;

    @ApiPropertyOptional({ type: PayrollSettingsConfigDto, description: 'Global payroll settings (cycles, dates, logic)' })
    @IsOptional()
    @ValidateNested()
    @Type(() => PayrollSettingsConfigDto)
    payrollConfiguration?: PayrollSettingsConfigDto;

    @ApiPropertyOptional({ type: WorkingDaysConfigDto, description: 'Working days configuration' })
    @IsOptional()
    @ValidateNested()
    @Type(() => WorkingDaysConfigDto)
    workingDays?: WorkingDaysConfigDto;

    @ApiPropertyOptional({ type: LeavesConfigDto, description: 'Leaves configuration' })
    @IsOptional()
    @ValidateNested()
    @Type(() => LeavesConfigDto)
    leaves?: LeavesConfigDto;
}
