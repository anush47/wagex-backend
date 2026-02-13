import { PrismaService } from '../prisma/prisma.service';
import { SalaryEngineService } from './services/salary-engine.service';
import { GenerateSalaryDto, SalaryQueryDto } from './dto/salary.dto';
export declare class SalariesService {
    private readonly prisma;
    private readonly engine;
    constructor(prisma: PrismaService, engine: SalaryEngineService);
    generatePreviews(dto: GenerateSalaryDto): Promise<any[]>;
    saveDrafts(previews: any[]): Promise<any[]>;
    findAll(query: SalaryQueryDto): Promise<{
        items: ({
            employee: {
                employeeNo: number;
                fullName: string;
            };
        } & {
            id: string;
            basicSalary: number;
            status: import("@prisma/client").$Enums.SalaryStatus;
            companyId: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            remarks: string | null;
            periodStartDate: Date;
            periodEndDate: Date;
            payDate: Date;
            otAmount: number;
            otBreakdown: import("@prisma/client/runtime/client").JsonValue | null;
            noPayAmount: number;
            noPayBreakdown: import("@prisma/client/runtime/client").JsonValue | null;
            taxAmount: number;
            components: import("@prisma/client/runtime/client").JsonValue | null;
            advanceDeduction: number;
            netSalary: number;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: string): Promise<{
        employee: {
            id: string;
            email: string | null;
            employeeNo: number;
            nic: string | null;
            nameWithInitials: string;
            fullName: string;
            designation: string | null;
            address: string | null;
            phone: string | null;
            basicSalary: number;
            status: string;
            gender: import("@prisma/client").$Enums.Gender;
            employmentType: import("@prisma/client").$Enums.EmploymentType;
            joinedDate: Date;
            resignedDate: Date | null;
            remark: string | null;
            companyId: string;
            userId: string | null;
            managerId: string | null;
            canSelfEdit: boolean;
            photo: string | null;
            files: import("@prisma/client/runtime/client").JsonValue | null;
            departmentId: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        payments: {
            id: string;
            companyId: string;
            createdAt: Date;
            updatedAt: Date;
            date: Date;
            remarks: string | null;
            salaryId: string | null;
            advanceId: string | null;
            amount: number;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            referenceNo: string | null;
        }[];
    } & {
        id: string;
        basicSalary: number;
        status: import("@prisma/client").$Enums.SalaryStatus;
        companyId: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        remarks: string | null;
        periodStartDate: Date;
        periodEndDate: Date;
        payDate: Date;
        otAmount: number;
        otBreakdown: import("@prisma/client/runtime/client").JsonValue | null;
        noPayAmount: number;
        noPayBreakdown: import("@prisma/client/runtime/client").JsonValue | null;
        taxAmount: number;
        components: import("@prisma/client/runtime/client").JsonValue | null;
        advanceDeduction: number;
        netSalary: number;
    }>;
}
