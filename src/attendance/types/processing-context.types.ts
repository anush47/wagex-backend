import { PolicySettingsDto, ShiftDto } from '../../policies/dto/policy-settings.dto';
import { Holiday, Employee, Company, LeaveRequest } from '@prisma/client';

export interface ProcessingContext {
  employee?: Employee & { company?: Company };
  policy?: PolicySettingsDto;
  leaves?: LeaveRequest[];
  holidays?: Holiday[];
  shift?: ShiftDto;
  timezone?: string;
}

export interface BulkProcessingContext {
  employees: Map<string, Employee & { company: Company }>;
  policies: Map<string, PolicySettingsDto>;
  leaves: Map<string, LeaveRequest[]>; // employeeId -> leaves
  holidays: Map<string, Holiday[]>; // calendarId -> holidays
}
