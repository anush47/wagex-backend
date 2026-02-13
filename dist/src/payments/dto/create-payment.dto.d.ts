import { PaymentMethod } from '@prisma/client';
export declare class CreatePaymentDto {
    companyId: string;
    salaryId?: string;
    advanceId?: string;
    amount: number;
    date: string;
    paymentMethod: PaymentMethod;
    referenceNo?: string;
    remarks?: string;
}
