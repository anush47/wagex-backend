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
var AttendanceProcessingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceProcessingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const shift_selection_service_1 = require("./shift-selection.service");
const attendance_calculation_service_1 = require("./attendance-calculation.service");
const leave_integration_service_1 = require("./leave-integration.service");
const client_1 = require("@prisma/client");
const policies_service_1 = require("../../policies/policies.service");
const attendance_policy_dto_1 = require("../../policies/dto/attendance-policy.dto");
let AttendanceProcessingService = AttendanceProcessingService_1 = class AttendanceProcessingService {
    prisma;
    shiftService;
    calculationService;
    leaveService;
    policiesService;
    logger = new common_1.Logger(AttendanceProcessingService_1.name);
    constructor(prisma, shiftService, calculationService, leaveService, policiesService) {
        this.prisma = prisma;
        this.shiftService = shiftService;
        this.calculationService = calculationService;
        this.leaveService = leaveService;
        this.policiesService = policiesService;
    }
    async processEmployeeDate(employeeId, date) {
        this.logger.log(`Processing attendance for employee ${employeeId} on ${date.toISOString()}`);
        const sessionDate = new Date(date);
        sessionDate.setHours(0, 0, 0, 0);
        const events = await this.getEventsForDate(employeeId, sessionDate);
        if (events.length === 0) {
            this.logger.warn(`No events found for employee ${employeeId} on ${sessionDate.toISOString()}`);
            return null;
        }
        const shift = await this.shiftService.getEffectiveShift(employeeId, sessionDate, events[0]?.eventTime);
        const leaves = await this.leaveService.getApprovedLeaves(employeeId, sessionDate);
        const firstIn = events.find((e) => e.eventType === 'IN');
        const lastOut = events
            .slice()
            .reverse()
            .find((e) => e.eventType === 'OUT');
        const times = this.calculationService.calculateWorkTime(events, shift);
        const flags = this.calculationService.calculateStatusFlags(firstIn?.eventTime || null, lastOut?.eventTime || null, shift, leaves);
        return this.createOrUpdateSession(employeeId, sessionDate, events, shift, times, flags);
    }
    async getEventsForDate(employeeId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        return this.prisma.attendanceEvent.findMany({
            where: {
                employeeId,
                eventTime: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                status: 'ACTIVE',
            },
            orderBy: {
                eventTime: 'asc',
            },
        });
    }
    async createOrUpdateSession(employeeId, date, events, shift, times, flags) {
        const firstIn = events.find((e) => e.eventType === 'IN');
        const lastOut = events
            .slice()
            .reverse()
            .find((e) => e.eventType === 'OUT');
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true },
        });
        if (!employee) {
            throw new Error('Employee not found');
        }
        const policy = await this.policiesService.getEffectivePolicy(employeeId);
        const approvalConfig = policy?.attendance?.approvalPolicy;
        const existingSession = await this.prisma.attendanceSession.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date,
                },
            },
        });
        if (existingSession?.manuallyEdited) {
            this.logger.log(`Session for ${employeeId} on ${date.toISOString()} was manually edited, skipping auto-processing`);
            return existingSession;
        }
        const determineApproval = (event, isLate) => {
            if (!event)
                return client_1.ApprovalStatus.APPROVED;
            if (!approvalConfig)
                return client_1.ApprovalStatus.APPROVED;
            if (approvalConfig.mode === 'AUTO_APPROVE') {
                return client_1.ApprovalStatus.APPROVED;
            }
            if (event.source === 'MANUAL')
                return client_1.ApprovalStatus.PENDING;
            switch (approvalConfig.mode) {
                case attendance_policy_dto_1.ApprovalPolicyMode.REQUIRE_APPROVAL_ALL:
                    return client_1.ApprovalStatus.PENDING;
                case attendance_policy_dto_1.ApprovalPolicyMode.REQUIRE_APPROVAL_EXCEPTIONS:
                    if (isLate && (approvalConfig.exceptionTriggers?.deviceMismatch || approvalConfig.exceptionTriggers?.outsideZone)) {
                        return client_1.ApprovalStatus.PENDING;
                    }
                    return client_1.ApprovalStatus.APPROVED;
                default:
                    return client_1.ApprovalStatus.APPROVED;
            }
        };
        const inApprovalStatus = determineApproval(firstIn, flags.isLate);
        const outApprovalStatus = determineApproval(lastOut, flags.isEarlyLeave);
        const workingDaysConfig = policy?.workingDays;
        let workDayStatus = client_1.SessionWorkDayStatus.FULL;
        if (workingDaysConfig?.defaultPattern) {
            const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const dayOfWeek = dayNames[date.getDay()];
            const dayConfig = workingDaysConfig.defaultPattern[dayOfWeek];
            if (dayConfig) {
                if (dayConfig.type === 'OFF') {
                    workDayStatus = client_1.SessionWorkDayStatus.OFF;
                }
                else if (dayConfig.type === 'HALF') {
                    workDayStatus = dayConfig.halfDayShift === 'LAST'
                        ? client_1.SessionWorkDayStatus.HALF_LAST
                        : client_1.SessionWorkDayStatus.HALF_FIRST;
                }
            }
        }
        const sessionData = {
            employeeId,
            companyId: employee.companyId,
            date,
            shiftId: shift?.id || null,
            shiftName: shift?.name || null,
            shiftStartTime: shift?.startTime || null,
            shiftEndTime: shift?.endTime || null,
            shiftBreakMinutes: shift?.breakMinutes || null,
            checkInTime: firstIn?.eventTime || null,
            checkOutTime: lastOut?.eventTime || null,
            checkInLocation: firstIn?.location || null,
            checkInLatitude: firstIn?.latitude || null,
            checkInLongitude: firstIn?.longitude || null,
            checkOutLocation: lastOut?.location || null,
            checkOutLatitude: lastOut?.latitude || null,
            checkOutLongitude: lastOut?.longitude || null,
            totalMinutes: times.totalMinutes,
            breakMinutes: times.breakMinutes,
            workMinutes: times.workMinutes,
            overtimeMinutes: times.overtimeMinutes,
            isLate: flags.isLate,
            isEarlyLeave: flags.isEarlyLeave,
            isOnLeave: flags.isOnLeave,
            isHalfDay: flags.isHalfDay,
            hasShortLeave: flags.hasShortLeave,
            manuallyEdited: false,
            autoCheckout: false,
            workDayStatus,
            inApprovalStatus,
            outApprovalStatus,
        };
        const session = await this.prisma.attendanceSession.upsert({
            where: {
                employeeId_date: {
                    employeeId,
                    date,
                },
            },
            create: sessionData,
            update: {
                ...sessionData,
            },
        });
        await this.prisma.attendanceEvent.updateMany({
            where: {
                id: {
                    in: events.map((e) => e.id),
                },
            },
            data: {
                sessionId: session.id,
            },
        });
        this.logger.log(`Session ${session.id} created/updated successfully`);
        return session;
    }
    async processDateRange(companyId, startDate, endDate) {
        this.logger.log(`Processing attendance for company ${companyId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
        const employees = await this.prisma.employee.findMany({
            where: { companyId },
            select: { id: true },
        });
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            for (const employee of employees) {
                await this.processEmployeeDate(employee.id, new Date(currentDate));
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        this.logger.log('Bulk processing completed');
    }
};
exports.AttendanceProcessingService = AttendanceProcessingService;
exports.AttendanceProcessingService = AttendanceProcessingService = AttendanceProcessingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shift_selection_service_1.ShiftSelectionService,
        attendance_calculation_service_1.AttendanceCalculationService,
        leave_integration_service_1.LeaveIntegrationService,
        policies_service_1.PoliciesService])
], AttendanceProcessingService);
//# sourceMappingURL=attendance-processing.service.js.map