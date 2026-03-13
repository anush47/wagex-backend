import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalaryAdvanceDto } from './dto/create-advance.dto';
import { AdvanceStatus, PaymentMethod } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class AdvancesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly paymentsService: PaymentsService
    ) { }

    async create(dto: CreateSalaryAdvanceDto) {
        const advance = await this.prisma.salaryAdvance.create({
            data: {
                employeeId: dto.employeeId,
                companyId: dto.companyId,
                totalAmount: dto.totalAmount,
                remainingAmount: dto.totalAmount,
                date: new Date(dto.date),
                reason: dto.reason,
                deductionSchedule: (dto.deductionSchedule || []) as any,
                remarks: dto.remarks,
                status: AdvanceStatus.APPROVED,
            },
        });

        // Auto-create payment
        await this.paymentsService.create({
            companyId: dto.companyId,
            advanceId: advance.id,
            amount: dto.totalAmount,
            date: dto.date,
            paymentMethod: PaymentMethod.CASH, // Default to CASH for now
            remarks: 'Auto-disbursed upon issuance',
        });

        return advance;
    }

    async findAll(companyId: string) {
        return this.prisma.salaryAdvance.findMany({
            where: { companyId },
            include: { 
                employee: { select: { fullName: true, employeeNo: true } },
                payments: true
            },
            orderBy: { date: 'desc' },
        });
    }

    async findOne(id: string) {
        const advance = await this.prisma.salaryAdvance.findUnique({
            where: { id },
            include: { employee: true, payments: true },
        });
        if (!advance) throw new NotFoundException(`Advance ${id} not found`);
        return advance;
    }

    async approve(id: string) {
        return this.prisma.salaryAdvance.update({
            where: { id },
            data: { status: AdvanceStatus.APPROVED },
        });
    }

    async getActiveDeductions(employeeId: string, startDate: Date, endDate: Date) {
        const advances = await this.prisma.salaryAdvance.findMany({
            where: {
                employeeId,
                status: { in: [AdvanceStatus.APPROVED, AdvanceStatus.PAID] }, // Must be approved or paid to be deducted
                remainingAmount: { gt: 0 },
            }
        });

        const activeDeductions = advances.filter(advance => {
            const schedule = (advance.deductionSchedule as any[]) || [];
            return schedule.some(s => 
                !s.isDeducted && 
                new Date(s.periodStartDate).getTime() >= startDate.getTime() &&
                new Date(s.periodStartDate).getTime() <= endDate.getTime()
            );
        }).map(advance => {
            const schedule = (advance.deductionSchedule as any[]) || [];
            const installment = schedule.find(s => 
                !s.isDeducted && 
                new Date(s.periodStartDate).getTime() >= startDate.getTime() &&
                new Date(s.periodStartDate).getTime() <= endDate.getTime()
            );
            return {
                advanceId: advance.id,
                amount: installment.amount,
                reason: advance.reason,
            };
        });

        return activeDeductions;
    }

    async remove(id: string) {
        const advance = await this.findOne(id);
        
        // Safety check: Don't delete if there are payments
        if (advance.payments && advance.payments.length > 0) {
            throw new Error('Cannot delete an advance that has associated payments');
        }

        // Safety check: Don't delete if any deduction has been made
        const schedule = (advance.deductionSchedule as any[]) || [];
        if (schedule.some(s => s.isDeducted)) {
            throw new Error('Cannot delete an advance that has already been partially recovered');
        }

        return this.prisma.salaryAdvance.delete({
            where: { id },
        });
    }

    async bulkRemove(ids: string[]) {
        // Find all advances with their payments and schedules
        const advances = await this.prisma.salaryAdvance.findMany({
            where: { id: { in: ids } },
            include: { payments: true }
        });

        // Filter out those that are safe to delete
        const safeToDelete = advances.filter(adv => {
            const hasPayments = adv.payments && adv.payments.length > 0;
            const hasDeductions = ((adv.deductionSchedule as any[]) || []).some(s => s.isDeducted);
            return !hasPayments && !hasDeductions;
        });

        if (safeToDelete.length === 0) {
            throw new Error('None of the selected advances are eligible for deletion (they may have payments or recoveries)');
        }

        const safeIds = safeToDelete.map(adv => adv.id);

        return this.prisma.salaryAdvance.deleteMany({
            where: { id: { in: safeIds } }
        });
    }
}
