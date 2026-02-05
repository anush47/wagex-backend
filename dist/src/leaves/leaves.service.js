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
var LeavesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeavesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const policies_service_1 = require("../policies/policies.service");
const leave_enum_1 = require("./enums/leave.enum");
let LeavesService = LeavesService_1 = class LeavesService {
    prisma;
    policiesService;
    logger = new common_1.Logger(LeavesService_1.name);
    constructor(prisma, policiesService) {
        this.prisma = prisma;
        this.policiesService = policiesService;
    }
    async getBalances(employeeId, currentDate = new Date()) {
        this.logger.log(`Calculating balances for employee ${employeeId}`);
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: { company: true }
        });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee ${employeeId} not found`);
        }
        const policyDetail = await this.policiesService.getEffectivePolicyDetail(employeeId);
        const leaveTypes = policyDetail.effective.leaves?.leaveTypes || [];
        const balances = [];
        for (const leaveType of leaveTypes) {
            const period = this.calculatePeriod(leaveType.accrualFrequency, employee.joinedDate, currentDate);
            const entitled = this.calculateEntitlement(leaveType, employee.joinedDate, period);
            const used = await this.calculateUsage(employeeId, leaveType.id, period);
            const pending = await this.calculatePending(employeeId, leaveType.id, period);
            balances.push({
                leaveTypeId: leaveType.id,
                leaveTypeName: leaveType.name,
                leaveTypeCode: leaveType.code,
                entitled,
                used,
                pending,
                available: entitled - used - pending,
                period
            });
        }
        return balances;
    }
    async createRequest(dto) {
        this.logger.log(`Creating leave request for employee ${dto.employeeId}`);
        const employee = await this.prisma.employee.findUnique({
            where: { id: dto.employeeId }
        });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee ${dto.employeeId} not found`);
        }
        const policyDetail = await this.policiesService.getEffectivePolicyDetail(dto.employeeId);
        const leaveType = policyDetail.effective.leaves?.leaveTypes?.find(lt => lt.id === dto.leaveTypeId);
        if (!leaveType) {
            throw new common_1.BadRequestException(`Leave type ${dto.leaveTypeId} not found in employee policy`);
        }
        const { days, minutes } = this.calculateDuration(dto, leaveType);
        const period = this.calculatePeriod(leaveType.accrualFrequency, employee.joinedDate, new Date(dto.startDate));
        const leaveNumber = await this.calculateLeaveNumber(dto.employeeId, dto.leaveTypeId, period);
        const balances = await this.getBalances(dto.employeeId, new Date(dto.startDate));
        const balance = balances.find(b => b.leaveTypeId === dto.leaveTypeId);
        if (!balance || balance.available < days) {
            throw new common_1.BadRequestException(`Insufficient leave balance. Available: ${balance?.available || 0}, Requested: ${days}`);
        }
        if (dto.type === leave_enum_1.LeaveRequestType.SHORT_LEAVE && leaveType.isShortLeave) {
            if (minutes && leaveType.maxDurationMinutes && minutes > leaveType.maxDurationMinutes) {
                throw new common_1.BadRequestException(`Short leave duration exceeds maximum of ${leaveType.maxDurationMinutes} minutes`);
            }
        }
        return this.prisma.leaveRequest.create({
            data: {
                employeeId: dto.employeeId,
                companyId: dto.companyId,
                leaveTypeId: dto.leaveTypeId,
                leaveTypeName: leaveType.name,
                type: dto.type,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                days,
                minutes,
                leaveNumber,
                reason: dto.reason,
                documents: dto.documents || [],
                status: leave_enum_1.LeaveStatus.PENDING
            }
        });
    }
    async updateRequest(id, dto) {
        this.logger.log(`Updating leave request ${id}`);
        const request = await this.prisma.leaveRequest.findUnique({ where: { id } });
        if (!request) {
            throw new common_1.NotFoundException(`Leave request ${id} not found`);
        }
        return this.prisma.leaveRequest.update({
            where: { id },
            data: {
                status: dto.status,
                responseReason: dto.responseReason,
                managerId: dto.managerId
            }
        });
    }
    async findAll(companyId, filters) {
        return this.prisma.leaveRequest.findMany({
            where: {
                companyId,
                ...(filters?.status && { status: filters.status }),
                ...(filters?.employeeId && { employeeId: filters.employeeId })
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        nameWithInitials: true,
                        fullName: true,
                        photo: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async findOne(id) {
        const request = await this.prisma.leaveRequest.findUnique({
            where: { id },
            include: {
                employee: true
            }
        });
        if (!request) {
            throw new common_1.NotFoundException(`Leave request ${id} not found`);
        }
        return request;
    }
    calculatePeriod(frequency, joinedDate, currentDate) {
        const start = new Date(currentDate);
        const end = new Date(currentDate);
        switch (frequency) {
            case 'MONTHLY':
                start.setDate(1);
                end.setMonth(end.getMonth() + 1, 0);
                break;
            case 'YEARLY':
                start.setMonth(0, 1);
                end.setMonth(11, 31);
                break;
            case 'QUARTERLY':
                const quarter = Math.floor(currentDate.getMonth() / 3);
                start.setMonth(quarter * 3, 1);
                end.setMonth(quarter * 3 + 3, 0);
                break;
            default:
                start.setMonth(0, 1);
                end.setMonth(11, 31);
        }
        return { start, end };
    }
    calculateEntitlement(leaveType, joinedDate, period) {
        let entitlement = leaveType.baseAmount;
        if (joinedDate > period.start) {
            const totalDays = (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24);
            const remainingDays = (period.end.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24);
            entitlement = (leaveType.baseAmount * remainingDays) / totalDays;
        }
        return Math.round(entitlement * 10) / 10;
    }
    async calculateUsage(employeeId, leaveTypeId, period) {
        const result = await this.prisma.leaveRequest.aggregate({
            where: {
                employeeId,
                leaveTypeId,
                status: leave_enum_1.LeaveStatus.APPROVED,
                startDate: { gte: period.start },
                endDate: { lte: period.end }
            },
            _sum: { days: true }
        });
        return result._sum.days || 0;
    }
    async calculatePending(employeeId, leaveTypeId, period) {
        const result = await this.prisma.leaveRequest.aggregate({
            where: {
                employeeId,
                leaveTypeId,
                status: leave_enum_1.LeaveStatus.PENDING,
                startDate: { gte: period.start },
                endDate: { lte: period.end }
            },
            _sum: { days: true }
        });
        return result._sum.days || 0;
    }
    async calculateLeaveNumber(employeeId, leaveTypeId, period) {
        const count = await this.prisma.leaveRequest.count({
            where: {
                employeeId,
                leaveTypeId,
                startDate: { gte: period.start },
                endDate: { lte: period.end }
            }
        });
        return count + 1;
    }
    calculateDuration(dto, leaveType) {
        if (dto.type === leave_enum_1.LeaveRequestType.SHORT_LEAVE) {
            const start = new Date(dto.startDate);
            const end = new Date(dto.endDate);
            const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
            return { days: 1, minutes };
        }
        if (dto.type === leave_enum_1.LeaveRequestType.HALF_DAY_FIRST || dto.type === leave_enum_1.LeaveRequestType.HALF_DAY_LAST) {
            return { days: 0.5, minutes: null };
        }
        const start = new Date(dto.startDate);
        const end = new Date(dto.endDate);
        let days = 0;
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                days++;
            }
        }
        return { days, minutes: null };
    }
};
exports.LeavesService = LeavesService;
exports.LeavesService = LeavesService = LeavesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        policies_service_1.PoliciesService])
], LeavesService);
//# sourceMappingURL=leaves.service.js.map