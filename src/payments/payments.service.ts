import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SalaryStatus, AdvanceStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreatePaymentDto) {
        if (!dto.salaryId && !dto.advanceId) {
            throw new BadRequestException('Either salaryId or advanceId must be provided');
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Create Payment record
            const payment = await tx.payment.create({
                data: {
                    companyId: dto.companyId,
                    salaryId: dto.salaryId,
                    advanceId: dto.advanceId,
                    amount: dto.amount,
                    date: new Date(dto.date),
                    paymentMethod: dto.paymentMethod,
                    referenceNo: dto.referenceNo,
                    remarks: dto.remarks,
                },
            });

            // 2. Update Salary Status if applicable
            if (dto.salaryId) {
                const salary = await tx.salary.findUnique({ where: { id: dto.salaryId } });
                if (salary) {
                    const totalPaid = (await tx.payment.aggregate({
                        _sum: { amount: true },
                        where: { salaryId: dto.salaryId },
                    }))._sum.amount || 0;

                    const newStatus = totalPaid >= salary.netSalary ? SalaryStatus.PAID : SalaryStatus.PARTIALLY_PAID;
                    await tx.salary.update({
                        where: { id: dto.salaryId },
                        data: { status: newStatus },
                    });
                }
            }

            // 3. Update Advance Status if applicable
            if (dto.advanceId) {
                // Advance issuing payment
                await tx.salaryAdvance.update({
                    where: { id: dto.advanceId },
                    data: { status: AdvanceStatus.PAID },
                });
            }

            return payment;
        });
    }

    async findAll(companyId: string) {
        return this.prisma.payment.findMany({
            where: { companyId },
            include: {
                salary: { include: { employee: { select: { fullName: true } } } },
                advance: { include: { employee: { select: { fullName: true } } } },
            },
            orderBy: { date: 'desc' },
        });
    }
}
