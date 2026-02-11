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
const session_grouping_service_1 = require("./session-grouping.service");
let AttendanceProcessingService = AttendanceProcessingService_1 = class AttendanceProcessingService {
    prisma;
    shiftService;
    calculationService;
    leaveService;
    policiesService;
    sessionGroupingService;
    logger = new common_1.Logger(AttendanceProcessingService_1.name);
    constructor(prisma, shiftService, calculationService, leaveService, policiesService, sessionGroupingService) {
        this.prisma = prisma;
        this.shiftService = shiftService;
        this.calculationService = calculationService;
        this.leaveService = leaveService;
        this.policiesService = policiesService;
        this.sessionGroupingService = sessionGroupingService;
    }
    async processEmployeeDate(employeeId, date) {
        this.logger.log(`Processing attendance for employee ${employeeId} on ${date.toISOString()}`);
        const events = await this.sessionGroupingService.getEventsForSessionGrouping(employeeId, date);
        if (events.length === 0) {
            this.logger.warn(`No events found for employee ${employeeId} around ${date.toISOString()}`);
            return [];
        }
        const sessionGroups = await this.sessionGroupingService.groupEventsIntoSessions(employeeId, events, date);
        if (sessionGroups.length === 0) {
            this.logger.warn(`No session groups created for employee ${employeeId} around ${date.toISOString()}`);
            return [];
        }
        this.logger.log(`[PROCESSING] Found ${sessionGroups.length} session groups for ${employeeId}`);
        const sessions = [];
        for (const sessionGroup of sessionGroups) {
            const shift = await this.shiftService.getEffectiveShift(employeeId, sessionGroup.firstIn || date, sessionGroup.firstIn || date);
            const leaves = await this.leaveService.getApprovedLeaves(employeeId, sessionGroup.sessionDate);
            const calculation = this.calculationService.calculate({ sessionGroup }, shift, leaves);
            const times = calculation;
            const flags = calculation;
            const session = await this.createOrUpdateSessionFromGroup(employeeId, sessionGroup, shift, times, flags);
            if (session) {
                sessions.push(session);
            }
        }
        return sessions;
    }
    async createOrUpdateSessionFromGroup(employeeId, sessionGroup, shift, times, flags) {
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true },
        });
        if (!employee) {
            throw new Error('Employee not found');
        }
        const effectivePolicyData = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                policy: true,
                company: { include: { policy: true } }
            }
        });
        const policySrc = effectivePolicyData?.policy ? 'EMPLOYEE_OVERRIDE' : 'COMPANY_DEFAULT';
        this.logger.log(`[ATTENDANCE_LOGIC] Policy Source for ${employeeId}: ${policySrc}`);
        const policy = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                policy: true,
                company: { include: { policy: true } }
            }
        });
        const effectivePolicy = await this.policiesService.getEffectivePolicy(employeeId);
        const approvalConfig = effectivePolicy?.attendance?.approvalPolicy;
        const firstInEvent = sessionGroup.events.find((e) => e.eventType === 'IN');
        const lastOutEvent = sessionGroup.events
            .slice()
            .reverse()
            .find((e) => e.eventType === 'OUT');
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
        const inApprovalStatus = determineApproval(firstInEvent, flags.isLate);
        const outApprovalStatus = determineApproval(lastOutEvent, flags.isEarlyLeave);
        const workDayStatus = this.calculationService.determineWorkDayStatus(sessionGroup.sessionDate, effectivePolicy);
        const policySettings = effectivePolicy;
        const workCalendarId = policySettings.workingDays?.workingCalendar || policySettings.attendance?.calendarId || policySettings.calendarId;
        const payrollCalendarId = policySettings.workingDays?.payrollCalendar || policySettings.payrollConfiguration?.calendarId || policySettings.calendarId;
        const { workHolidayId, payrollHolidayId } = await this.calculationService.resolveHolidays(sessionGroup.sessionDate, workCalendarId, payrollCalendarId);
        const sessionData = {
            employeeId,
            companyId: employee.companyId,
            date: sessionGroup.sessionDate,
            shiftId: shift?.id || null,
            shiftName: shift?.name || null,
            shiftStartTime: shift?.startTime || null,
            shiftEndTime: shift?.endTime || null,
            shiftBreakMinutes: shift?.breakTime || null,
            checkInTime: sessionGroup.firstIn || null,
            checkOutTime: sessionGroup.lastOut || null,
            checkInLocation: firstInEvent?.location || null,
            checkInLatitude: firstInEvent?.latitude || null,
            checkInLongitude: firstInEvent?.longitude || null,
            checkOutLocation: lastOutEvent?.location || null,
            checkOutLatitude: lastOutEvent?.latitude || null,
            checkOutLongitude: lastOutEvent?.longitude || null,
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
            additionalInOutCount: sessionGroup.additionalInOutPairs.length,
            workDayStatus,
            inApprovalStatus,
            outApprovalStatus,
            workHolidayId,
            payrollHolidayId,
        };
        let session = await this.prisma.attendanceSession.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date: sessionGroup.sessionDate,
                },
            },
        });
        this.logger.log(`[SESSION_LOOKUP] Searching for ${employeeId} on ${sessionGroup.sessionDate.toISOString()}. Found: ${session ? session.id : 'NONE'}`);
        if (session) {
            await this.prisma.attendanceEvent.updateMany({
                where: {
                    id: { in: sessionGroup.events.map((e) => e.id) },
                },
                data: { sessionId: session.id },
            });
            if (session.manuallyEdited) {
                this.logger.log(`[MERGE_MANUAL] Session ${session.id} is manuallyEdited. Merging logs into summary.`);
                const manualUpdateData = {
                    ...sessionData,
                    checkInTime: session.checkInTime || sessionData.checkInTime,
                    checkOutTime: session.checkOutTime || sessionData.checkOutTime,
                };
                delete manualUpdateData.manuallyEdited;
                session = await this.prisma.attendanceSession.update({
                    where: { id: session.id },
                    data: {
                        ...manualUpdateData,
                        additionalInOutCount: sessionGroup.additionalInOutPairs.length,
                    }
                });
                return session;
            }
        }
        session = await this.prisma.attendanceSession.upsert({
            where: {
                employeeId_date: {
                    employeeId,
                    date: sessionGroup.sessionDate,
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
                    in: sessionGroup.events.map((e) => e.id),
                },
            },
            data: {
                sessionId: session.id,
            },
        });
        this.logger.log(`Session ${session.id} created/updated successfully from ${sessionGroup.events.length} events`);
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
        policies_service_1.PoliciesService,
        session_grouping_service_1.SessionGroupingService])
], AttendanceProcessingService);
//# sourceMappingURL=attendance-processing.service.js.map