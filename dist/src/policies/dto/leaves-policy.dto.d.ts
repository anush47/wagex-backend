import { EmploymentType } from '../../common/enums/employee.enum';
export declare enum AccrualFrequency {
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    QUARTERLY = "QUARTERLY",
    HALF_YEARLY = "HALF_YEARLY",
    YEARLY = "YEARLY",
    CUSTOM = "CUSTOM"
}
export declare enum EncashmentType {
    MULTIPLIER_BASED = "MULTIPLIER_BASED",
    FIXED_AMOUNT = "FIXED_AMOUNT"
}
export declare enum PolicyGenderTarget {
    MALE = "MALE",
    FEMALE = "FEMALE",
    ALL = "ALL"
}
export declare class LeaveTypeDto {
    id: string;
    name: string;
    code: string;
    applicableGender: PolicyGenderTarget;
    applicableEmploymentTypes: EmploymentType[];
    requiresApproval: boolean;
    approvalRequiredIfConsecutiveMoreThan?: number;
    isShortLeave: boolean;
    maxDurationMinutes?: number;
    baseAmount: number;
    accrualFrequency: AccrualFrequency;
    customFrequencyDays?: number;
    minDelayBetweenRequestsDays?: number;
    canApplyBackdated?: boolean;
    maxConsecutiveDays?: number;
    requireDocuments?: boolean;
    requireDocumentsIfConsecutiveMoreThan?: number;
    canCarryOver: boolean;
    maxCarryOverDays?: number;
    isEncashable: boolean;
    encashmentType?: EncashmentType;
    encashmentMultiplier?: number;
    fixedAmount?: number;
}
export declare class LeavesConfigDto {
    leaveTypes: LeaveTypeDto[];
}
