import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    create(dto: CreatePaymentDto): Promise<{
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
    }>;
    findAll(companyId: string): Promise<({
        salary: ({
            employee: {
                fullName: string;
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
        }) | null;
        advance: ({
            employee: {
                fullName: string;
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
        }) | null;
    } & {
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
    })[]>;
}
