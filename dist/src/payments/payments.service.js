"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let PaymentsService = class PaymentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        if (!dto.salaryId && !dto.advanceId) {
            throw new common_1.BadRequestException('Either salaryId or advanceId must be provided');
        }
        return this.prisma.$transaction(async (tx) => {
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
            if (dto.salaryId) {
                const salary = await tx.salary.findUnique({ where: { id: dto.salaryId } });
                if (salary) {
                    const totalPaid = (await tx.payment.aggregate({
                        _sum: { amount: true },
                        where: { salaryId: dto.salaryId },
                    }))._sum.amount || 0;
                    const newStatus = totalPaid >= salary.netSalary ? client_1.SalaryStatus.PAID : client_1.SalaryStatus.PARTIALLY_PAID;
                    await tx.salary.update({
                        where: { id: dto.salaryId },
                        data: { status: newStatus },
                    });
                }
            }
            if (dto.advanceId) {
                await tx.salaryAdvance.update({
                    where: { id: dto.advanceId },
                    data: { status: client_1.AdvanceStatus.PAID },
                });
            }
            return payment;
        });
    }
    async findAll(companyId) {
        return this.prisma.payment.findMany({
            where: { companyId },
            include: {
                salary: { include: { employee: { select: { fullName: true } } } },
                advance: { include: { employee: { select: { fullName: true } } } },
            },
            orderBy: { date: 'desc' },
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map