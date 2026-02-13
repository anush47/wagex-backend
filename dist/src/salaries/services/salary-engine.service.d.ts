import { PrismaService } from '../../prisma/prisma.service';
import { PoliciesService } from '../../policies/policies.service';
import { AttendanceProcessingService } from '../../attendance/services/attendance-processing.service';
import { PayrollComponentType } from '../../policies/dto/salary-components-policy.dto';
export declare class SalaryEngineService {
    private readonly prisma;
    private readonly policiesService;
    private readonly attendanceService;
    constructor(prisma: PrismaService, policiesService: PoliciesService, attendanceService: AttendanceProcessingService);
    calculatePreview(companyId: string, periodStart: Date, periodEnd: Date, employeeId: string): Promise<{
        employeeId: string;
        employeeName: string;
        periodStartDate: Date;
        periodEndDate: Date;
        basicSalary: number;
        otAmount: number;
        otBreakdown: {
            type: string;
            hours: number;
            amount: number;
        }[];
        noPayAmount: number;
        noPayBreakdown: {
            type: string;
            count: number;
            amount: number;
        }[];
        taxAmount: number;
        components: {
            id: string;
            name: string;
            category: import("../../policies/dto/salary-components-policy.dto").PayrollComponentCategory;
            type: PayrollComponentType;
            value: number;
            amount: number;
        }[];
        advanceDeduction: number;
        netSalary: number;
        advanceAdjustments: any[];
    }>;
    bulkGenerate(companyId: string, periodStart: Date, periodEnd: Date, employeeIds?: string[]): Promise<any[]>;
}
