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
var LeaveIntegrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveIntegrationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let LeaveIntegrationService = LeaveIntegrationService_1 = class LeaveIntegrationService {
    prisma;
    logger = new common_1.Logger(LeaveIntegrationService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getApprovedLeaves(employeeId, date) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            const leaves = await this.prisma.leaveRequest.findMany({
                where: {
                    employeeId,
                    status: 'APPROVED',
                    OR: [
                        {
                            AND: [
                                { startDate: { lte: endOfDay } },
                                { endDate: { gte: startOfDay } },
                            ],
                        },
                    ],
                },
            });
            return leaves.map((leave) => ({
                id: leave.id,
                type: leave.type,
                startDate: leave.startDate,
                endDate: leave.endDate,
                days: leave.days,
                minutes: leave.minutes ?? undefined,
            }));
        }
        catch (error) {
            this.logger.error(`Error fetching leaves: ${error.message}`);
            return [];
        }
    }
    async hasFullDayLeave(employeeId, date) {
        const leaves = await this.getApprovedLeaves(employeeId, date);
        return leaves.some((leave) => leave.type === 'FULL_DAY');
    }
    async hasHalfDayLeave(employeeId, date) {
        const leaves = await this.getApprovedLeaves(employeeId, date);
        return leaves.some((leave) => leave.type === 'HALF_DAY_FIRST' || leave.type === 'HALF_DAY_LAST');
    }
    async getShortLeaveMinutes(employeeId, date) {
        const leaves = await this.getApprovedLeaves(employeeId, date);
        return leaves
            .filter((leave) => leave.type === 'SHORT_LEAVE')
            .reduce((total, leave) => total + (leave.minutes || 0), 0);
    }
};
exports.LeaveIntegrationService = LeaveIntegrationService;
exports.LeaveIntegrationService = LeaveIntegrationService = LeaveIntegrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeaveIntegrationService);
//# sourceMappingURL=leave-integration.service.js.map