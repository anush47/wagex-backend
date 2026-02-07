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
var ShiftSelectionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftSelectionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ShiftSelectionService = ShiftSelectionService_1 = class ShiftSelectionService {
    prisma;
    logger = new common_1.Logger(ShiftSelectionService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getEffectiveShift(employeeId, date, eventTime) {
        try {
            const employee = await this.prisma.employee.findUnique({
                where: { id: employeeId },
                select: { companyId: true },
            });
            if (!employee) {
                this.logger.warn(`Employee not found: ${employeeId}`);
                return null;
            }
            const policy = await this.prisma.policy.findUnique({
                where: { companyId: employee.companyId },
            });
            if (!policy || !policy.settings) {
                this.logger.warn(`No policy found for company: ${employee.companyId}`);
                return null;
            }
            const settings = policy.settings;
            const shiftsConfig = settings.shifts;
            if (!shiftsConfig) {
                return null;
            }
            const employeePolicy = await this.prisma.policy.findUnique({
                where: { employeeId },
            });
            if (employeePolicy && employeePolicy.settings) {
                const empSettings = employeePolicy.settings;
                if (empSettings.shifts) {
                    return this.selectShiftByPolicy(empSettings.shifts, eventTime);
                }
            }
            return this.selectShiftByPolicy(shiftsConfig, eventTime);
        }
        catch (error) {
            this.logger.error(`Error getting effective shift: ${error.message}`);
            return null;
        }
    }
    selectShiftByPolicy(shiftsConfig, eventTime) {
        const policy = shiftsConfig.shiftSelectionPolicy || 'FIXED';
        const shifts = shiftsConfig.list || shiftsConfig.shifts || [];
        const defaultShiftId = shiftsConfig.defaultShiftId;
        if (shifts.length === 0) {
            return null;
        }
        if (defaultShiftId && (policy === 'FIXED' || !eventTime)) {
            const defaultShift = shifts.find((s) => s.id === defaultShiftId);
            if (defaultShift)
                return this.mapShift(defaultShift);
        }
        switch (policy) {
            case 'FIXED':
                return this.mapShift(shifts[0]);
            case 'CLOSEST_START_TIME':
                if (!eventTime) {
                    return this.mapShift(shifts[0]);
                }
                return this.findClosestShift(shifts, eventTime);
            case 'MANUAL':
            case 'EMPLOYEE_ROSTER':
                return this.mapShift(shifts[0]);
            default:
                return this.mapShift(shifts[0]);
        }
    }
    findClosestShift(shifts, eventTime) {
        const eventHour = eventTime.getHours();
        const eventMinute = eventTime.getMinutes();
        const eventTotalMinutes = eventHour * 60 + eventMinute;
        let closestShift = shifts[0];
        let minDiff = Infinity;
        for (const shift of shifts) {
            const [startHour, startMinute] = shift.startTime.split(':').map(Number);
            const shiftTotalMinutes = startHour * 60 + startMinute;
            const diff = Math.abs(eventTotalMinutes - shiftTotalMinutes);
            if (diff < minDiff) {
                minDiff = diff;
                closestShift = shift;
            }
        }
        return this.mapShift(closestShift);
    }
    mapShift(shift) {
        return {
            id: shift.id,
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            breakTime: shift.breakTime || 0,
            gracePeriodLate: shift.gracePeriodLate || 0,
            autoClockOut: shift.autoClockOut || false,
        };
    }
};
exports.ShiftSelectionService = ShiftSelectionService;
exports.ShiftSelectionService = ShiftSelectionService = ShiftSelectionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ShiftSelectionService);
//# sourceMappingURL=shift-selection.service.js.map