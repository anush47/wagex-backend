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
var AttendanceManualService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceManualService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const attendance_processing_service_1 = require("./attendance-processing.service");
const attendance_calculation_service_1 = require("./attendance-calculation.service");
const leave_integration_service_1 = require("./leave-integration.service");
const policies_service_1 = require("../../policies/policies.service");
let AttendanceManualService = AttendanceManualService_1 = class AttendanceManualService {
    prisma;
    processingService;
    calculationService;
    policiesService;
    leaveService;
    logger = new common_1.Logger(AttendanceManualService_1.name);
    constructor(prisma, processingService, calculationService, policiesService, leaveService) {
        this.prisma = prisma;
        this.processingService = processingService;
        this.calculationService = calculationService;
        this.policiesService = policiesService;
        this.leaveService = leaveService;
    }
    async createManualEvent(dto, source = 'MANUAL') {
        this.logger.log(`Creating ${source} event for employee ${dto.employeeId || dto.employeeNo}`);
        let employeeId;
        let companyId;
        if (dto.employeeId) {
            const employee = await this.prisma.employee.findUnique({
                where: { id: dto.employeeId },
                select: { id: true, companyId: true },
            });
            if (!employee) {
                throw new common_1.NotFoundException('Employee not found');
            }
            employeeId = employee.id;
            companyId = employee.companyId;
        }
        else if (dto.employeeNo) {
            throw new common_1.BadRequestException('Employee number resolution requires company context');
        }
        else {
            throw new common_1.BadRequestException('Either employeeId or employeeNo required');
        }
        const event = await this.prisma.attendanceEvent.create({
            data: {
                employeeId,
                companyId,
                eventTime: new Date(dto.eventTime),
                eventType: dto.eventType || 'IN',
                source,
                device: dto.device || 'Manual Entry',
                location: dto.location,
                latitude: dto.latitude,
                longitude: dto.longitude,
                remark: dto.remark,
                status: 'ACTIVE',
            },
        });
        const eventDate = new Date(dto.eventTime);
        try {
            await this.processingService.processEmployeeDate(employeeId, eventDate);
        }
        catch (error) {
            this.logger.error(`Failed to process manual event: ${error.message}`);
        }
        return event;
    }
    async createManualSession(dto) {
        const { employeeId, date, shiftId } = dto;
        const sessionDate = new Date(date);
        sessionDate.setUTCHours(0, 0, 0, 0);
        const existing = await this.prisma.attendanceSession.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date: sessionDate,
                },
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('Session already exists for this date');
        }
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true },
        });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        const session = await this.prisma.attendanceSession.create({
            data: {
                employeeId,
                companyId: employee.companyId,
                date: sessionDate,
                shiftId,
                manuallyEdited: true,
                inApprovalStatus: 'APPROVED',
                outApprovalStatus: 'APPROVED',
            },
        });
        await this.processingService.processEmployeeDate(employeeId, sessionDate);
        return this.prisma.attendanceSession.findUniqueOrThrow({ where: { id: session.id } });
    }
    async updateSession(id, dto) {
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id },
        });
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        const updateData = {
            ...dto,
            checkInTime: dto.checkInTime === null ? null : (dto.checkInTime ? new Date(dto.checkInTime) : undefined),
            checkOutTime: dto.checkOutTime === null ? null : (dto.checkOutTime ? new Date(dto.checkOutTime) : undefined),
            manuallyEdited: true,
        };
        if (dto.checkInTime) {
            const dateObj = new Date(dto.checkInTime);
            const newDate = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));
            if (newDate.getTime() !== session.date.getTime()) {
                const conflict = await this.prisma.attendanceSession.findUnique({
                    where: { employeeId_date: { employeeId: session.employeeId, date: newDate } }
                });
                if (conflict && conflict.id !== id) {
                    throw new common_1.BadRequestException('Session already exists on this date');
                }
                updateData.date = newDate;
            }
        }
        const effectiveIn = updateData.checkInTime !== undefined ? updateData.checkInTime : session.checkInTime;
        const effectiveOut = updateData.checkOutTime !== undefined ? updateData.checkOutTime : session.checkOutTime;
        const effectiveShiftId = dto.shiftId !== undefined ? (dto.shiftId === "none" ? null : dto.shiftId) : session.shiftId;
        const effectiveDate = updateData.date || session.date;
        const policy = await this.policiesService.getEffectivePolicy(session.employeeId);
        const policySettings = policy;
        const workCalId = policySettings.workingDays?.workingCalendar || policySettings.attendance?.calendarId || policySettings.calendarId;
        const payCalId = policySettings.workingDays?.payrollCalendar || policySettings.payrollConfiguration?.calendarId || policySettings.calendarId;
        let calcShift = null;
        if (effectiveShiftId) {
            calcShift = policySettings.shifts?.list?.find((s) => s.id === effectiveShiftId);
        }
        const leaves = await this.leaveService.getApprovedLeaves(session.employeeId, effectiveDate);
        const effectiveOverride = dto.isBreakOverrideActive !== undefined ? dto.isBreakOverrideActive : session.isBreakOverrideActive;
        let breakMins;
        if (effectiveOverride) {
            breakMins = dto.breakMinutes ?? session.breakMinutes ?? 0;
        }
        else {
            const events = await this.prisma.attendanceEvent.findMany({ where: { sessionId: id }, orderBy: { eventTime: 'asc' } });
            const calculated = this.calculationService.calculateBreaksFromEvents(events);
            breakMins = Math.max(calculated.breakMinutes, calcShift?.breakTime ?? session.shiftBreakMinutes ?? 0);
        }
        const calculation = this.calculationService.calculate({ checkInTime: effectiveIn, checkOutTime: effectiveOut, shiftBreakMinutes: breakMins }, calcShift, leaves);
        updateData.isLate = calculation.isLate;
        updateData.isEarlyLeave = calculation.isEarlyLeave;
        updateData.isOnLeave = calculation.isOnLeave;
        updateData.isHalfDay = calculation.isHalfDay;
        updateData.hasShortLeave = calculation.hasShortLeave;
        updateData.workDayStatus = this.calculationService.determineWorkDayStatus(effectiveDate, policySettings);
        updateData.totalMinutes = calculation.totalMinutes;
        updateData.workMinutes = dto.workMinutes !== undefined ? dto.workMinutes : calculation.workMinutes;
        updateData.breakMinutes = effectiveOverride ? (dto.breakMinutes ?? session.breakMinutes ?? calculation.breakMinutes) : calculation.breakMinutes;
        updateData.overtimeMinutes = dto.overtimeMinutes !== undefined ? dto.overtimeMinutes : calculation.overtimeMinutes;
        if (dto.shiftId !== undefined) {
            if (dto.shiftId === null || dto.shiftId === "none") {
                updateData.shiftName = updateData.shiftStartTime = updateData.shiftEndTime = updateData.shiftBreakMinutes = updateData.shiftId = null;
            }
            else if (calcShift) {
                updateData.shiftName = calcShift.name;
                updateData.shiftStartTime = calcShift.startTime;
                updateData.shiftEndTime = calcShift.endTime;
                updateData.shiftBreakMinutes = calcShift.breakTime;
            }
        }
        const holidays = await this.calculationService.resolveHolidays(effectiveDate, workCalId, payCalId);
        updateData.workHolidayId = holidays.workHolidayId;
        updateData.payrollHolidayId = holidays.payrollHolidayId;
        return this.prisma.attendanceSession.update({ where: { id }, data: updateData });
    }
    async deleteSession(id) {
        const session = await this.prisma.attendanceSession.findUnique({ where: { id } });
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        await this.prisma.attendanceEvent.updateMany({
            where: { sessionId: id },
            data: { sessionId: null, status: 'IGNORED' },
        });
        await this.prisma.attendanceSession.delete({ where: { id } });
        return { message: 'Session deleted successfully' };
    }
    async linkEventToSession(eventId, sessionId) {
        const event = await this.prisma.attendanceEvent.findUnique({ where: { id: eventId } });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
        const session = await this.prisma.attendanceSession.findUnique({ where: { id: sessionId } });
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        await this.prisma.attendanceEvent.update({ where: { id: eventId }, data: { sessionId } });
        await this.processingService.processEmployeeDate(session.employeeId, session.date);
    }
    async unlinkEventFromSession(eventId) {
        const event = await this.prisma.attendanceEvent.findUnique({ where: { id: eventId }, include: { session: true } });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
        const oldSession = event.session;
        await this.prisma.attendanceEvent.update({ where: { id: eventId }, data: { sessionId: null } });
        if (oldSession) {
            await this.processingService.processEmployeeDate(oldSession.employeeId, oldSession.date);
        }
    }
    async updateEventType(eventId, eventType) {
        const event = await this.prisma.attendanceEvent.findUnique({
            where: { id: eventId },
            include: { session: true }
        });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
        await this.prisma.attendanceEvent.update({
            where: { id: eventId },
            data: { eventType }
        });
        await this.processingService.processEmployeeDate(event.employeeId, new Date(event.eventTime));
        if (event.session && event.session.date.getTime() !== new Date(event.eventTime).setUTCHours(0, 0, 0, 0)) {
            await this.processingService.processEmployeeDate(event.employeeId, event.session.date);
        }
    }
};
exports.AttendanceManualService = AttendanceManualService;
exports.AttendanceManualService = AttendanceManualService = AttendanceManualService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        attendance_processing_service_1.AttendanceProcessingService,
        attendance_calculation_service_1.AttendanceCalculationService,
        policies_service_1.PoliciesService,
        leave_integration_service_1.LeaveIntegrationService])
], AttendanceManualService);
//# sourceMappingURL=attendance-manual.service.js.map