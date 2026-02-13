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
exports.SalariesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const salary_engine_service_1 = require("./services/salary-engine.service");
const client_1 = require("@prisma/client");
let SalariesService = class SalariesService {
    prisma;
    engine;
    constructor(prisma, engine) {
        this.prisma = prisma;
        this.engine = engine;
    }
    async generatePreviews(dto) {
        return this.engine.bulkGenerate(dto.companyId, new Date(dto.periodStartDate), new Date(dto.periodEndDate), dto.employeeIds);
    }
    async saveDrafts(previews) {
        const savedSalaries = [];
        for (const preview of previews) {
            const salary = await this.prisma.$transaction(async (tx) => {
                const created = await tx.salary.create({
                    data: {
                        companyId: preview.companyId || (await tx.employee.findUnique({ where: { id: preview.employeeId } }))?.companyId,
                        employeeId: preview.employeeId,
                        periodStartDate: preview.periodStartDate,
                        periodEndDate: preview.periodEndDate,
                        payDate: preview.payDate || new Date(),
                        basicSalary: preview.basicSalary,
                        otAmount: preview.otAmount,
                        otBreakdown: preview.otBreakdown,
                        noPayAmount: preview.noPayAmount,
                        noPayBreakdown: preview.noPayBreakdown,
                        taxAmount: preview.taxAmount,
                        components: preview.components,
                        advanceDeduction: preview.advanceDeduction,
                        netSalary: preview.netSalary,
                        status: client_1.SalaryStatus.DRAFT,
                    },
                });
                if (preview.advanceAdjustments) {
                    for (const adj of preview.advanceAdjustments) {
                        const advance = await tx.salaryAdvance.findUnique({ where: { id: adj.advanceId } });
                        if (advance) {
                            const schedule = advance.deductionSchedule || [];
                            const updatedSchedule = schedule.map(s => {
                                if (new Date(s.periodStartDate).getTime() === new Date(preview.periodStartDate).getTime()) {
                                    return { ...s, isDeducted: true };
                                }
                                return s;
                            });
                            await tx.salaryAdvance.update({
                                where: { id: adj.advanceId },
                                data: {
                                    deductionSchedule: updatedSchedule,
                                    remainingAmount: { decrement: adj.amount },
                                },
                            });
                        }
                    }
                }
                return created;
            });
            savedSalaries.push(salary);
        }
        return savedSalaries;
    }
    async findAll(query) {
        const { companyId, employeeId, startDate, endDate, status, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (companyId)
            where.companyId = companyId;
        if (employeeId)
            where.employeeId = employeeId;
        if (status)
            where.status = status;
        if (startDate || endDate) {
            where.periodStartDate = {};
            if (startDate)
                where.periodStartDate.gte = new Date(startDate);
            if (endDate)
                where.periodStartDate.lte = new Date(endDate);
        }
        const [items, total] = await Promise.all([
            this.prisma.salary.findMany({
                where,
                skip,
                take: limit,
                orderBy: { periodStartDate: 'desc' },
                include: { employee: { select: { fullName: true, employeeNo: true } } },
            }),
            this.prisma.salary.count({ where }),
        ]);
        return { items, total, page, limit };
    }
    async findOne(id) {
        const salary = await this.prisma.salary.findUnique({
            where: { id },
            include: { employee: true, payments: true },
        });
        if (!salary)
            throw new common_1.NotFoundException(`Salary ${id} not found`);
        return salary;
    }
};
exports.SalariesService = SalariesService;
exports.SalariesService = SalariesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        salary_engine_service_1.SalaryEngineService])
], SalariesService);
//# sourceMappingURL=salaries.service.js.map