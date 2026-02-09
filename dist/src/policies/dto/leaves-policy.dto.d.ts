import { EmploymentType, Gender } from '../../common/enums/employee.enum';
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
export declare enum AccrualMethod {
    PRO_RATA = "PRO_RATA",
    FULL_UPFRONT = "FULL_UPFRONT"
}
export declare enum HolidayEarnCategory {
    PUBLIC = "PUBLIC",
    MERCANTILE = "MERCANTILE",
    BANK = "BANK"
}
export declare class LeaveTypeDto {
    id: string;
    name: string;
    code: string;
    color?: string;
    applicableGenders: Gender[];
    applicableEmploymentTypes: EmploymentType[];
    requiresApproval: boolean;
    approvalRequiredIfConsecutiveMoreThan?: number;
    isShortLeave: boolean;
    maxDurationMinutes?: number;
    baseAmount: number;
    accrualFrequency: AccrualFrequency;
    accrualMethod: AccrualMethod;
    customFrequencyDays?: number;
    minDelayBetweenRequestsDays?: number;
    minNoticeDays?: number;
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
    isHolidayReplacement: boolean;
    earnedOnHolidayCategories?: HolidayEarnCategory[];
}
export declare class LeavesConfigDto {
    leaveTypes: LeaveTypeDto[];
}
