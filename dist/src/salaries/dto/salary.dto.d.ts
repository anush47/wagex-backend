export declare class GenerateSalaryDto {
    companyId: string;
    periodStartDate: string;
    periodEndDate: string;
    employeeIds?: string[];
}
export declare class SalaryQueryDto {
    page?: number;
    limit?: number;
    companyId?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
}
