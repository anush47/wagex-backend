import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SalaryStatus, AdvanceStatus, PaymentStatus } from '@prisma/client';
import { PoliciesService } from '../policies/policies.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policiesService: PoliciesService,
  ) {}

  async create(dto: CreatePaymentDto) {
    if (!dto.salaryId && !dto.advanceId) {
      throw new BadRequestException('Either salaryId or advanceId must be provided');
    }

    return this.prisma.$transaction(async (tx) => {
      // 0. Check for auto-acknowledgement in policy
      let status: PaymentStatus = PaymentStatus.PENDING_ACKNOWLEDGEMENT;

      if (dto.salaryId || dto.advanceId) {
        const resource = dto.salaryId
          ? await tx.salary.findUnique({ where: { id: dto.salaryId }, select: { employeeId: true } })
          : await tx.salaryAdvance.findUnique({ where: { id: dto.advanceId }, select: { employeeId: true } });

        if (resource?.employeeId) {
          const policy = await this.policiesService.getEffectivePolicy(resource.employeeId);
          if (policy.payrollConfiguration?.autoAcknowledgePayments) {
            status = PaymentStatus.ACKNOWLEDGED;
          }
        }
      }

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
          status: status,
        },
      });

      // 2. Update Salary Status if applicable
      if (dto.salaryId) {
        const salary = await tx.salary.findUnique({ where: { id: dto.salaryId } });
        if (salary) {
          const totalPaid =
            (
              await tx.payment.aggregate({
                _sum: { amount: true },
                where: { salaryId: dto.salaryId },
              })
            )._sum.amount || 0;

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
        salary: { include: { employee: { select: { fullName: true, employeeNo: true } } } },
        advance: { include: { employee: { select: { fullName: true, employeeNo: true } } } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
        include: { salary: true, advance: true },
      });

      if (!payment) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }

      // 1. Delete the payment
      await tx.payment.delete({ where: { id } });

      // 2. Re-calculate Salary Status if applicable
      if (payment.salaryId) {
        const totalPaid =
          (
            await tx.payment.aggregate({
              _sum: { amount: true },
              where: { salaryId: payment.salaryId },
            })
          )._sum.amount || 0;

        let newStatus: SalaryStatus = SalaryStatus.APPROVED;
        if (totalPaid > 0) {
          newStatus = totalPaid >= payment.salary!.netSalary ? SalaryStatus.PAID : SalaryStatus.PARTIALLY_PAID;
        }

        await tx.salary.update({
          where: { id: payment.salaryId },
          data: { status: newStatus },
        });
      }

      // 3. Re-calculate Advance Status if applicable
      if (payment.advanceId) {
        // For advances, if the issuing payment is deleted, it goes back to APPROVED
        await tx.salaryAdvance.update({
          where: { id: payment.advanceId },
          data: { status: AdvanceStatus.APPROVED },
        });
      }

      return { success: true };
    });
  }
}
