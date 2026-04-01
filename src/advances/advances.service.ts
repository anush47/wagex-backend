import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalaryAdvanceDto } from './dto/create-advance.dto';
import { AdvanceStatus, PaymentMethod } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service';

export interface DeductionInstallment {
  periodStartDate: string;
  periodEndDate: string;
  amount: number;
  isDeducted: boolean;
  deductedAt?: string;
  salaryId?: string;
}

@Injectable()
export class AdvancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async create(dto: CreateSalaryAdvanceDto) {
    const deductionSchedule = (dto.deductionSchedule || []).map((item) => ({
      ...item,
      isDeducted: false,
    }));

    const advance = await this.prisma.salaryAdvance.create({
      data: {
        employeeId: dto.employeeId,
        companyId: dto.companyId,
        totalAmount: dto.totalAmount,
        remainingAmount: dto.totalAmount,
        date: new Date(dto.date),
        reason: dto.reason,
        deductionSchedule: deductionSchedule as any,
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
      paymentMethod: PaymentMethod.CASH,
      remarks: 'Auto-disbursed upon issuance',
    });

    return advance;
  }

  async findAll(companyId: string) {
    return this.prisma.salaryAdvance.findMany({
      where: { companyId },
      include: {
        employee: { select: { fullName: true, employeeNo: true } },
        payments: true,
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
        status: { in: [AdvanceStatus.APPROVED, AdvanceStatus.PAID] },
        remainingAmount: { gt: 0 },
      },
    });

    const activeDeductions: { advanceId: string; amount: number; reason: string | null }[] = [];

    for (const advance of advances) {
      const schedule = (advance.deductionSchedule as unknown as DeductionInstallment[]) || [];
      const installment = schedule.find(
        (s) =>
          !s.isDeducted &&
          new Date(s.periodStartDate).getTime() >= startDate.getTime() &&
          new Date(s.periodStartDate).getTime() <= endDate.getTime(),
      );

      if (installment) {
        activeDeductions.push({
          advanceId: advance.id,
          amount: installment.amount,
          reason: advance.reason || 'Salary Advance Deduction',
        });
      }
    }

    return activeDeductions;
  }

  async remove(id: string) {
    const advance = await this.findOne(id);

    if (advance.payments && advance.payments.length > 0) {
      throw new BadRequestException('Cannot delete an advance that has associated payments');
    }

    const schedule = (advance.deductionSchedule as unknown as DeductionInstallment[]) || [];
    if (schedule.some((s) => s.isDeducted)) {
      throw new BadRequestException('Cannot delete an advance that has already been partially recovered');
    }

    return this.prisma.salaryAdvance.delete({
      where: { id },
    });
  }

  async bulkRemove(ids: string[]) {
    const advances = await this.prisma.salaryAdvance.findMany({
      where: { id: { in: ids } },
      include: { payments: true },
    });

    const safeToDelete = advances.filter((adv) => {
      const hasPayments = adv.payments && adv.payments.length > 0;
      const schedule = (adv.deductionSchedule as unknown as DeductionInstallment[]) || [];
      const hasDeductions = schedule.some((s) => s.isDeducted);
      return !hasPayments && !hasDeductions;
    });

    if (safeToDelete.length === 0) {
      throw new BadRequestException('None of the selected advances are eligible for deletion');
    }

    const safeIds = safeToDelete.map((adv) => adv.id);

    return this.prisma.salaryAdvance.deleteMany({
      where: { id: { in: safeIds } },
    });
  }
}
