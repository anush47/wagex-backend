import { LeaveStatus } from '../enums/leave.enum';
export declare class UpdateLeaveRequestDto {
    status?: LeaveStatus;
    responseReason?: string;
    managerId?: string;
}
