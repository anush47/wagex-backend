import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalaryAdvanceDto } from './dto/create-advance.dto';
import { AdvanceStatus } from '@prisma/client';

@Injectable()
export class AdvancesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateSalaryAdvanceDto) {
        return this.prisma.salaryAdvance.create({
            data: {
                employeeId: dto.employeeId,
                companyId: dto.companyId,
                totalAmount: dto.totalAmount,
                remainingAmount: dto.totalAmount,
                date: new Date(dto.date),
                reason: dto.reason,
                deductionSchedule: (dto.deductionSchedule || []) as any,
                remarks: dto.remarks,
                status: AdvanceStatus.PENDING,
            },
        });
    }

    async findAll(companyId: string) {
        return this.prisma.salaryAdvance.findMany({
            where: { companyId },
            include: { employee: { select: { fullName: true, employeeNo: true } } },
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
}
