declare class DeductionScheduleItemDto {
    periodStartDate: string;
    periodEndDate: string;
    amount: number;
}
export declare class CreateSalaryAdvanceDto {
    employeeId: string;
    companyId: string;
    totalAmount: number;
    date: string;
    reason?: string;
    deductionSchedule?: DeductionScheduleItemDto[];
    remarks?: string;
}
export {};
