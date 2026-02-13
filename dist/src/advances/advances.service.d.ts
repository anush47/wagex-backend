import { PrismaService } from '../prisma/prisma.service';
import { CreateSalaryAdvanceDto } from './dto/create-advance.dto';
export declare class AdvancesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateSalaryAdvanceDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        status: import("@prisma/client").$Enums.AdvanceStatus;
        employeeId: string;
        reason: string | null;
        date: Date;
        remarks: string | null;
        totalAmount: number;
        deductionSchedule: import("@prisma/client/runtime/client").JsonValue | null;
        remainingAmount: number;
    }>;
    findAll(companyId: string): Promise<({
        employee: {
            fullName: string;
            employeeNo: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        status: import("@prisma/client").$Enums.AdvanceStatus;
        employeeId: string;
        reason: string | null;
        date: Date;
        remarks: string | null;
        totalAmount: number;
        deductionSchedule: import("@prisma/client/runtime/client").JsonValue | null;
        remainingAmount: number;
    })[]>;
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
            salaryId: string | null;
            advanceId: string | null;
            amount: number;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            referenceNo: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        status: import("@prisma/client").$Enums.AdvanceStatus;
        employeeId: string;
        reason: string | null;
        date: Date;
        remarks: string | null;
        totalAmount: number;
        deductionSchedule: import("@prisma/client/runtime/client").JsonValue | null;
        remainingAmount: number;
    }>;
    approve(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        status: import("@prisma/client").$Enums.AdvanceStatus;
        employeeId: string;
        reason: string | null;
        date: Date;
        remarks: string | null;
        totalAmount: number;
        deductionSchedule: import("@prisma/client/runtime/client").JsonValue | null;
        remainingAmount: number;
    }>;
}
