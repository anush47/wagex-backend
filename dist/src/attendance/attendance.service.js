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
const policies_service_1 = require("../policies/policies.service");
let AttendanceService = AttendanceService_1 = class AttendanceService {
    prisma;
    processingService;
    policiesService;
    logger = new common_1.Logger(AttendanceService_1.name);
    constructor(prisma, processingService, policiesService) {
        this.prisma = prisma;
        this.processingService = processingService;
        this.policiesService = policiesService;
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
            const newCheckInDate = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
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
        if (dto.shiftId !== undefined) {
            if (dto.shiftId === null) {
                updateData.shiftName = null;
                updateData.shiftStartTime = null;
                updateData.shiftEndTime = null;
                updateData.shiftBreakMinutes = null;
            }
            else {
                const policy = await this.policiesService.getEffectivePolicy(session.employeeId);
                const shiftList = policy.shifts?.list || [];
                const shift = shiftList.find((s) => s.id === dto.shiftId);
                if (shift) {
                    this.logger.log(`Found shift details: ${shift.name}, ${shift.startTime}-${shift.endTime}`);
                    updateData.shiftName = shift.name;
                    updateData.shiftStartTime = shift.startTime;
                    updateData.shiftEndTime = shift.endTime;
                    updateData.shiftBreakMinutes = shift.breakTime;
                }
                else {
                    this.logger.warn(`Shift ID ${dto.shiftId} not found in employee policy`);
                }
            }
        }
        const policy = await this.policiesService.getEffectivePolicy(session.employeeId);
        const policySettings = policy;
        const workCalendarId = policySettings.workingDays?.workingCalendar || policySettings.attendance?.calendarId || policySettings.calendarId;
        const payrollCalendarId = policySettings.workingDays?.payrollCalendar || policySettings.payrollConfiguration?.calendarId || policySettings.calendarId;
        const date = updateData.date || session.date;
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);
        if (workCalendarId || payrollCalendarId) {
            const calendars = await this.prisma.calendar.findMany({
                where: { id: { in: [workCalendarId, payrollCalendarId].filter(id => !!id) } },
                select: { id: true, name: true }
            });
            const getCalName = (id) => calendars.find(c => c.id === id)?.name || 'NONE';
            this.logger.log(`[ATTENDANCE_LOGIC] --- Manually Updating Session ---`);
            this.logger.log(`[ATTENDANCE_LOGIC] Work Calendar: ${getCalName(workCalendarId)} (${workCalendarId || 'MISSING'})`);
            this.logger.log(`[ATTENDANCE_LOGIC] Payroll Calendar: ${getCalName(payrollCalendarId)} (${payrollCalendarId || 'MISSING'})`);
            this.logger.log(`[ATTENDANCE_LOGIC] Search Range UTC: ${startOfDay.toISOString()} --- ${endOfDay.toISOString()}`);
            updateData.workHolidayId = null;
            updateData.payrollHolidayId = null;
            const findHoliday = async (calendarId, type) => {
                const holiday = await this.prisma.holiday.findFirst({
                    where: {
                        calendarId,
                        date: {
                            gte: startOfDay,
                            lte: endOfDay
                        }
                    },
                    select: { id: true, name: true }
                });
                if (holiday) {
                    this.logger.log(`[ATTENDANCE_LOGIC] ✅ Found ${type} Holiday: ${holiday.name}`);
                }
                else {
                    this.logger.log(`[ATTENDANCE_LOGIC] ❌ No ${type} Holiday in ${getCalName(calendarId)}`);
                }
                return holiday;
            };
            if (workCalendarId === payrollCalendarId && workCalendarId) {
                const holiday = await findHoliday(workCalendarId, 'JOINT');
                if (holiday) {
                    updateData.workHolidayId = holiday.id;
                    updateData.payrollHolidayId = holiday.id;
                }
            }
            else {
                const [workHoliday, payrollHoliday] = await Promise.all([
                    workCalendarId ? findHoliday(workCalendarId, 'WORK') : Promise.resolve(null),
                    payrollCalendarId ? findHoliday(payrollCalendarId, 'PAYROLL') : Promise.resolve(null),
                ]);
                if (workHoliday)
                    updateData.workHolidayId = workHoliday.id;
                if (payrollHoliday)
                    updateData.payrollHolidayId = payrollHoliday.id;
            }
        }
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
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = AttendanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        attendance_processing_service_1.AttendanceProcessingService,
        policies_service_1.PoliciesService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map