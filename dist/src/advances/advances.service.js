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
exports.AdvancesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AdvancesService = class AdvancesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        return this.prisma.salaryAdvance.create({
            data: {
                employeeId: dto.employeeId,
                companyId: dto.companyId,
                totalAmount: dto.totalAmount,
                remainingAmount: dto.totalAmount,
                date: new Date(dto.date),
                reason: dto.reason,
                deductionSchedule: (dto.deductionSchedule || []),
                remarks: dto.remarks,
                status: client_1.AdvanceStatus.PENDING,
            },
        });
    }
    async findAll(companyId) {
        return this.prisma.salaryAdvance.findMany({
            where: { companyId },
            include: { employee: { select: { fullName: true, employeeNo: true } } },
            orderBy: { date: 'desc' },
        });
    }
    async findOne(id) {
        const advance = await this.prisma.salaryAdvance.findUnique({
            where: { id },
            include: { employee: true, payments: true },
        });
        if (!advance)
            throw new common_1.NotFoundException(`Advance ${id} not found`);
        return advance;
    }
    async approve(id) {
        return this.prisma.salaryAdvance.update({
            where: { id },
            data: { status: client_1.AdvanceStatus.APPROVED },
        });
    }
};
exports.AdvancesService = AdvancesService;
exports.AdvancesService = AdvancesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdvancesService);
//# sourceMappingURL=advances.service.js.map