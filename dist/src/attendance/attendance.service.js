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
var AttendanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const attendance_processing_service_1 = require("./services/attendance-processing.service");
const attendance_calculation_service_1 = require("./services/attendance-calculation.service");
const leave_integration_service_1 = require("./services/leave-integration.service");
const policies_service_1 = require("../policies/policies.service");
let AttendanceService = AttendanceService_1 = class AttendanceService {
    prisma;
    processingService;
    policiesService;
    calculationService;
    leaveService;
    logger = new common_1.Logger(AttendanceService_1.name);
    constructor(prisma, processingService, policiesService, calculationService, leaveService) {
        this.prisma = prisma;
        this.processingService = processingService;
        this.policiesService = policiesService;
        this.calculationService = calculationService;
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
                eventType: dto.eventType,
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
        this.processingService
            .processEmployeeDate(employeeId, eventDate)
            .then((sessions) => {
            this.logger.log(`Processed ${sessions.length} sessions for employee ${employeeId} on ${eventDate.toISOString()}`);
        })
            .catch((error) => {
            this.logger.error(`Failed to process event: ${error.message}`);
        });
        return event;
    }
    async createExternalEvent(dto, companyId, apiKeyName) {
        this.logger.log(`Creating API_KEY event for employee ${dto.employeeNo} via ${apiKeyName}`);
        const employee = await this.prisma.employee.findFirst({
            where: {
                companyId,
                employeeNo: dto.employeeNo,
            },
        });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee ${dto.employeeNo} not found in company`);
        }
        const event = await this.prisma.attendanceEvent.create({
            data: {
                employeeId: employee.id,
                companyId,
                eventTime: new Date(dto.eventTime),
                eventType: dto.eventType,
                source: 'API_KEY',
                apiKeyName,
                device: dto.device,
                location: dto.location,
                latitude: dto.latitude,
                longitude: dto.longitude,
                status: 'ACTIVE',
            },
        });
        const eventDate = new Date(dto.eventTime);
        this.processingService
            .processEmployeeDate(employee.id, eventDate)
            .then((sessions) => {
            this.logger.log(`Processed ${sessions.length} sessions for employee ${employee.id} on ${eventDate.toISOString()}`);
        })
            .catch((error) => {
            this.logger.error(`Failed to process event: ${error.message}`);
        });
        return event;
    }
    async bulkCreateExternalEvents(dto, companyId, apiKeyName) {
        this.logger.log(`Bulk creating ${dto.events.length} events via ${apiKeyName}`);
        const results = [];
        let inserted = 0;
        let failed = 0;
        for (const eventDto of dto.events) {
            try {
                const event = await this.createExternalEvent(eventDto, companyId, apiKeyName);
                results.push({
                    employeeNo: eventDto.employeeNo,
                    status: 'success',
                    eventId: event.id,
                });
                inserted++;
            }
            catch (error) {
                results.push({
                    employeeNo: eventDto.employeeNo,
                    status: 'failed',
                    error: error.message,
                });
                failed++;
            }
        }
        return {
            success: failed === 0,
            inserted,
            failed,
            results,
        };
    }
    async getSessions(query) {
        const page = query.page || 1;
        const limit = query.limit || 15;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.companyId) {
            where.companyId = query.companyId;
        }
        if (query.employeeId) {
            where.employeeId = query.employeeId;
        }
        if (query.startDate || query.endDate) {
            where.date = {};
            if (query.startDate) {
                where.date.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                const end = new Date(query.endDate);
                end.setUTCHours(23, 59, 59, 999);
                where.date.lte = end;
            }
        }
        if (query.isPending) {
            where.OR = [
                { inApprovalStatus: 'PENDING' },
                { outApprovalStatus: 'PENDING' }
            ];
        }
        const [items, total] = await Promise.all([
            this.prisma.attendanceSession.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date: 'desc' },
                include: {
                    employee: {
                        select: {
                            employeeNo: true,
                            nameWithInitials: true,
                            fullName: true,
                            photo: true,
                        },
                    },
                    workHoliday: true,
                    payrollHoliday: true,
                },
            }),
            this.prisma.attendanceSession.count({ where }),
        ]);
        return {
            items,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
            },
        };
    }
    async getSession(id) {
        this.logger.log(`Fetching session ${id}`);
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id },
            include: {
                employee: {
                    select: {
                        employeeNo: true,
                        nameWithInitials: true,
                        fullName: true,
                        photo: true,
                    },
                },
                workHoliday: true,
                payrollHoliday: true,
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Session not found');
        }
        return session;
    }
    async getSessionEvents(sessionId) {
        this.logger.log(`Fetching events for session ${sessionId}`);
        const events = await this.prisma.attendanceEvent.findMany({
            where: { sessionId },
            orderBy: { eventTime: 'asc' },
            include: {
                employee: {
                    select: {
                        employeeNo: true,
                        nameWithInitials: true,
                        fullName: true,
                        photo: true,
                    },
                },
            },
        });
        return events;
    }
    async getEvents(query) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.companyId) {
            where.companyId = query.companyId;
        }
        if (query.employeeId) {
            where.employeeId = query.employeeId;
        }
        if (query.startDate || query.endDate) {
            where.eventTime = {};
            if (query.startDate) {
                where.eventTime.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                const end = new Date(query.endDate);
                end.setUTCHours(23, 59, 59, 999);
                where.eventTime.lte = end;
            }
        }
        if (query.status) {
            where.status = query.status;
        }
        const [items, total] = await Promise.all([
            this.prisma.attendanceEvent.findMany({
                where,
                skip,
                take: limit,
                orderBy: { eventTime: 'desc' },
                include: {
                    employee: {
                        select: {
                            employeeNo: true,
                            nameWithInitials: true,
                            fullName: true,
                            photo: true,
                        },
                    },
                },
            }),
            this.prisma.attendanceEvent.count({ where }),
        ]);
        return {
            items,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
            },
        };
    }
    async updateSession(id, dto) {
        this.logger.log(`Updating session ${id}`);
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id },
        });
        if (!session) {
            throw new common_1.NotFoundException('Session not found');
        }
        this.logger.log(`[ATTENDANCE_LOGIC] updateSession Input: ${JSON.stringify({
            in: dto.checkInTime,
            out: dto.checkOutTime,
            work: dto.workMinutes
        })}`);
        const updateData = {
            ...dto,
            checkInTime: dto.checkInTime === null ? null : (dto.checkInTime ? new Date(dto.checkInTime) : undefined),
            checkOutTime: dto.checkOutTime === null ? null : (dto.checkOutTime ? new Date(dto.checkOutTime) : undefined),
            manuallyEdited: true,
        };
        this.logger.log(`[ATTENDANCE_LOGIC] updateData conversion: IN: ${updateData.checkInTime?.toISOString() || 'NULL'}, OUT: ${updateData.checkOutTime?.toISOString() || 'NULL'}`);
        if (dto.checkInTime) {
            const dateObj = new Date(dto.checkInTime);
            const newCheckInDate = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));
            if (newCheckInDate.getTime() !== session.date.getTime()) {
                this.logger.log(`Shifting session date from ${session.date.toISOString()} to ${newCheckInDate.toISOString()}`);
                const conflict = await this.prisma.attendanceSession.findUnique({
                    where: {
                        employeeId_date: {
                            employeeId: session.employeeId,
                            date: newCheckInDate,
                        }
                    }
                });
                if (conflict && conflict.id !== id) {
                    throw new common_1.BadRequestException(`A session already exists for this employee on ${newCheckInDate.toISOString().split('T')[0]}.`);
                }
                updateData.date = newCheckInDate;
            }
        }
        if (dto.isBreakOverrideActive !== undefined) {
            updateData.isBreakOverrideActive = dto.isBreakOverrideActive;
        }
        const effectiveCheckIn = updateData.checkInTime !== undefined ? updateData.checkInTime : session.checkInTime;
        const effectiveCheckOut = updateData.checkOutTime !== undefined ? updateData.checkOutTime : session.checkOutTime;
        const effectiveShiftId = dto.shiftId !== undefined ? (dto.shiftId === "none" ? null : dto.shiftId) : session.shiftId;
        const effectiveDate = updateData.date || session.date;
        const policy = await this.policiesService.getEffectivePolicy(session.employeeId);
        const policySettings = policy;
        const workCalendarId = policySettings.workingDays?.workingCalendar || policySettings.attendance?.calendarId || policySettings.calendarId;
        const payrollCalendarId = policySettings.workingDays?.payrollCalendar || policySettings.payrollConfiguration?.calendarId || policySettings.calendarId;
        let calcShift = null;
        if (effectiveShiftId) {
            calcShift = policySettings.shifts?.list?.find((s) => s.id === effectiveShiftId);
        }
        const leaves = await this.leaveService.getApprovedLeaves(session.employeeId, effectiveDate);
        let breakMinutesToUse;
        if (session.isBreakOverrideActive) {
            breakMinutesToUse = dto.breakMinutes ?? session.breakMinutes ?? 0;
        }
        else {
            const sessionEvents = await this.prisma.attendanceEvent.findMany({
                where: { sessionId: id },
                orderBy: { eventTime: 'asc' }
            });
            if (sessionEvents.length > 0) {
                const calculatedBreaks = this.calculationService.calculateBreaksFromEvents(sessionEvents);
                const shiftBreak = calcShift?.breakTime ?? session.shiftBreakMinutes ?? 0;
                breakMinutesToUse = Math.max(calculatedBreaks.breakMinutes, shiftBreak);
            }
            else {
                breakMinutesToUse = calcShift?.breakTime ?? session.shiftBreakMinutes ?? 0;
            }
        }
        const calculation = this.calculationService.calculate({
            checkInTime: effectiveCheckIn,
            checkOutTime: effectiveCheckOut,
            shiftBreakMinutes: breakMinutesToUse
        }, calcShift, leaves);
        updateData.isLate = calculation.isLate;
        updateData.isEarlyLeave = calculation.isEarlyLeave;
        updateData.isOnLeave = calculation.isOnLeave;
        updateData.isHalfDay = calculation.isHalfDay;
        updateData.hasShortLeave = calculation.hasShortLeave;
        updateData.workDayStatus = this.calculationService.determineWorkDayStatus(effectiveDate, policySettings);
        updateData.totalMinutes = calculation.totalMinutes;
        updateData.workMinutes = dto.workMinutes !== undefined ? dto.workMinutes : calculation.workMinutes;
        if (session.isBreakOverrideActive) {
            updateData.breakMinutes = dto.breakMinutes ?? session.breakMinutes ?? calculation.breakMinutes;
        }
        else {
            updateData.breakMinutes = calculation.breakMinutes;
        }
        updateData.overtimeMinutes = dto.overtimeMinutes !== undefined ? dto.overtimeMinutes : calculation.overtimeMinutes;
        if (dto.shiftId !== undefined) {
            if (dto.shiftId === null || dto.shiftId === "none") {
                updateData.shiftName = null;
                updateData.shiftStartTime = null;
                updateData.shiftEndTime = null;
                updateData.shiftBreakMinutes = null;
                updateData.shiftId = null;
            }
            else if (calcShift) {
                updateData.shiftName = calcShift.name;
                updateData.shiftStartTime = calcShift.startTime;
                updateData.shiftEndTime = calcShift.endTime;
                updateData.shiftBreakMinutes = calcShift.breakTime;
            }
        }
        const holidayResults = await this.calculationService.resolveHolidays(effectiveDate, workCalendarId, payrollCalendarId);
        updateData.workHolidayId = holidayResults.workHolidayId;
        updateData.payrollHolidayId = holidayResults.payrollHolidayId;
        return this.prisma.attendanceSession.update({
            where: { id },
            data: updateData,
        });
    }
    async deleteSession(id) {
        this.logger.log(`Deleting session ${id}`);
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id },
        });
        if (!session) {
            throw new common_1.NotFoundException('Session not found');
        }
        await this.prisma.attendanceEvent.updateMany({
            where: { sessionId: id },
            data: {
                sessionId: null,
                status: 'IGNORED'
            },
        });
        await this.prisma.attendanceSession.delete({
            where: { id },
        });
        return { message: 'Session deleted successfully' };
    }
    async verifyApiKey(apiKey) {
        const policy = await this.prisma.policy.findFirst({
            where: {
                companyId: { not: null },
            },
            include: {
                company: true,
            },
        });
        if (!policy || !policy.settings || !policy.company) {
            return { valid: false };
        }
        const settings = policy.settings;
        const attendanceConfig = settings.attendance;
        if (!attendanceConfig || !attendanceConfig.apiKeys) {
            return { valid: false };
        }
        const keyConfig = attendanceConfig.apiKeys.find((k) => k.key === apiKey && k.enabled);
        if (!keyConfig) {
            return { valid: false };
        }
        return {
            valid: true,
            company: {
                id: policy.company.id,
                name: policy.company.name,
                employerNumber: policy.company.employerNumber,
            },
            apiKey: {
                id: keyConfig.id,
                name: keyConfig.name,
                lastUsedAt: new Date(),
            },
        };
    }
    async linkEventToSession(eventId, sessionId) {
        const event = await this.prisma.attendanceEvent.findUnique({
            where: { id: eventId },
        });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id: sessionId },
        });
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        await this.prisma.attendanceEvent.update({
            where: { id: eventId },
            data: { sessionId },
        });
        await this.processingService.processEmployeeDate(session.employeeId, session.date);
    }
    async unlinkEventFromSession(eventId) {
        const event = await this.prisma.attendanceEvent.findUnique({
            where: { id: eventId },
            include: { session: true },
        });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
        const oldSession = event.session;
        await this.prisma.attendanceEvent.update({
            where: { id: eventId },
            data: { sessionId: null },
        });
        if (oldSession) {
            await this.processingService.processEmployeeDate(oldSession.employeeId, oldSession.date);
        }
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = AttendanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        attendance_processing_service_1.AttendanceProcessingService,
        policies_service_1.PoliciesService,
        attendance_calculation_service_1.AttendanceCalculationService,
        leave_integration_service_1.LeaveIntegrationService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map