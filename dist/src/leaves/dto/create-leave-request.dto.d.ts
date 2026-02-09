import { LeaveRequestType } from '../enums/leave.enum';
export declare class CreateLeaveRequestDto {
    employeeId: string;
    companyId: string;
    leaveTypeId: string;
    type: LeaveRequestType;
    startDate: string;
    endDate: string;
    reason?: string;
    documents?: any[];
    holidayId?: string;
}
