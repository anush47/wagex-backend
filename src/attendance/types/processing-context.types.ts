import { PolicySettingsDto } from '../../policies/dto/policy-settings.dto';
import { AttendanceEvent, Holiday, LeaveRequest, Employee, Company } from '@prisma/client';

export interface ProcessingContext {
    employee?: Employee & { company?: Company };
    policy?: PolicySettingsDto;
    leaves?: any[]; // Simplified for now, can be specific Leave type
    holidays?: Holiday[];
    shift?: any;
    timezone?: string;
}

export interface BulkProcessingContext {
    employees: Map<string, Employee & { company: Company }>;
    policies: Map<string, PolicySettingsDto>;
    leaves: Map<string, any[]>; // employeeId -> leaves
    holidays: Map<string, Holiday[]>; // calendarId -> holidays
}
