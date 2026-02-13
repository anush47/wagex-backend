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
                fullName: string;
                employeeNo: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            status: import("@prisma/client").$Enums.SalaryStatus;
            basicSalary: number;
            components: import("@prisma/client/runtime/client").JsonValue | null;
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
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            companyId: string;
            email: string | null;
            nameWithInitials: string;
            fullName: string;
            address: string | null;
            phone: string | null;
            files: import("@prisma/client/runtime/client").JsonValue | null;
            status: string;
            employeeNo: number;
            nic: string | null;
            designation: string | null;
            basicSalary: number;
            gender: import("@prisma/client").$Enums.Gender;
            employmentType: import("@prisma/client").$Enums.EmploymentType;
            joinedDate: Date;
            resignedDate: Date | null;
            remark: string | null;
            managerId: string | null;
            canSelfEdit: boolean;
            photo: string | null;
            departmentId: string | null;
        };
        payments: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            date: Date;
            remarks: string | null;
            amount: number;
            salaryId: string | null;
            advanceId: string | null;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            referenceNo: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        status: import("@prisma/client").$Enums.SalaryStatus;
        basicSalary: number;
        components: import("@prisma/client/runtime/client").JsonValue | null;
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
        advanceDeduction: number;
        netSalary: number;
    }>;
}
