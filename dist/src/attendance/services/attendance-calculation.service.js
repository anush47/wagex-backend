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
var AttendanceCalculationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceCalculationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let AttendanceCalculationService = AttendanceCalculationService_1 = class AttendanceCalculationService {
    prisma;
    logger = new common_1.Logger(AttendanceCalculationService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    calculate(data, shift, leaves = []) {
        let workTime;
        if (data.sessionGroup) {
            workTime = this.calculateWorkTimeFromSessionGroup(data.sessionGroup, shift);
        }
        else if (data.events && data.events.length > 0) {
            workTime = this.calculateWorkTime(data.events, shift);
        }
        else {
            workTime = this.calculateManualWorkTime(data.checkInTime || null, data.checkOutTime || null, data.shiftBreakMinutes ?? shift?.breakTime ?? 0, shift);
        }
        let checkInTime = null;
        let checkOutTime = null;
        if (data.sessionGroup) {
            checkInTime = data.sessionGroup.firstIn;
            checkOutTime = data.sessionGroup.lastOut;
        }
        else {
            checkInTime = data.checkInTime || (data.events ? this.getFirstIn(data.events) : null);
            checkOutTime = data.checkOutTime || (data.events ? this.getLastOut(data.events) : null);
        }
        const flags = this.calculateStatusFlags(checkInTime, checkOutTime, shift, leaves);
        return {
            ...workTime,
            ...flags,
        };
    }
    getFirstIn(events) {
        return events.find(e => e.eventType === 'IN')?.eventTime || null;
    }
    getLastOut(events) {
        return [...events].reverse().find(e => e.eventType === 'OUT')?.eventTime || null;
    }
    calculateManualWorkTime(checkIn, checkOut, breakMinutes, shift) {
        if (!checkIn || !checkOut) {
            return {
                totalMinutes: 0,
                breakMinutes: 0,
                workMinutes: 0,
                overtimeMinutes: 0,
            };
        }
        const totalMinutes = Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60)));
        const workMinutes = Math.max(0, totalMinutes - breakMinutes);
        let overtimeMinutes = 0;
        if (shift) {
            const shiftDurationMinutes = this.getShiftDurationMinutes(shift);
            overtimeMinutes = Math.max(0, workMinutes - shiftDurationMinutes);
        }
        return {
            totalMinutes,
            breakMinutes,
            workMinutes,
            overtimeMinutes,
        };
    }
    calculateWorkTime(events, shift) {
        if (!events || events.length === 0) {
            return {
                totalMinutes: 0,
                breakMinutes: 0,
                workMinutes: 0,
                overtimeMinutes: 0,
            };
        }
        const sortedEvents = [...events].sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());
        const { totalMinutes, breakMinutes: calculatedBreakMinutes } = this.calculateBreaksFromEvents(sortedEvents);
        let breakMinutes = calculatedBreakMinutes;
        if (breakMinutes === 0 && totalMinutes > 360 && shift?.breakTime) {
            breakMinutes = shift.breakTime;
        }
        const workMinutes = Math.max(0, totalMinutes - breakMinutes);
        let overtimeMinutes = 0;
        if (shift) {
            const shiftDurationMinutes = this.getShiftDurationMinutes(shift);
            overtimeMinutes = Math.max(0, workMinutes - shiftDurationMinutes);
        }
        return {
            totalMinutes,
            breakMinutes,
            workMinutes,
            overtimeMinutes,
        };
    }
    calculateWorkTimeFromSessionGroup(sessionGroup, shift) {
        if (!sessionGroup.events || sessionGroup.events.length === 0) {
            return {
                totalMinutes: 0,
                breakMinutes: 0,
                workMinutes: 0,
                overtimeMinutes: 0,
            };
        }
        if (!sessionGroup.firstIn || !sessionGroup.lastOut) {
            return {
                totalMinutes: 0,
                breakMinutes: 0,
                workMinutes: 0,
                overtimeMinutes: 0,
            };
        }
        const totalMinutes = Math.max(0, Math.floor((sessionGroup.lastOut.getTime() - sessionGroup.firstIn.getTime()) / (1000 * 60)));
        let breakMinutes = 0;
        for (const pair of sessionGroup.additionalInOutPairs) {
            const pairBreak = Math.floor((pair.out.getTime() - pair.in.getTime()) / (1000 * 60));
            breakMinutes += pairBreak;
        }
        if (breakMinutes === 0 && shift?.breakTime && totalMinutes > 360) {
            breakMinutes = shift.breakTime;
        }
        const workMinutes = Math.max(0, totalMinutes - breakMinutes);
        let overtimeMinutes = 0;
        if (shift) {
            const shiftDurationMinutes = this.getShiftDurationMinutes(shift);
            overtimeMinutes = Math.max(0, workMinutes - shiftDurationMinutes);
        }
        return {
            totalMinutes,
            breakMinutes,
            workMinutes,
            overtimeMinutes,
        };
    }
    calculateBreaksFromEvents(events) {
        const pairs = [];
        let totalMinutes = 0;
        let breakMinutes = 0;
        let lastOut = null;
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            if (event.eventType === 'IN') {
                if (lastOut) {
                    const breakDuration = (event.eventTime.getTime() - lastOut.getTime()) / (1000 * 60);
                    breakMinutes += breakDuration;
                }
                const nextOut = events
                    .slice(i + 1)
                    .find((e) => e.eventType === 'OUT');
                if (nextOut) {
                    pairs.push({ in: event.eventTime, out: nextOut.eventTime });
                    const duration = (nextOut.eventTime.getTime() - event.eventTime.getTime()) /
                        (1000 * 60);
                    totalMinutes += duration;
                    lastOut = nextOut.eventTime;
                }
            }
        }
        return { totalMinutes, breakMinutes, pairs };
    }
    calculateStatusFlags(checkInTime, checkOutTime, shift, leaves) {
        const flags = {
            isLate: false,
            isEarlyLeave: false,
            isOnLeave: false,
            isHalfDay: false,
            hasShortLeave: false,
        };
        if (leaves.length > 0) {
            flags.isOnLeave = leaves.some((l) => l.type === 'FULL_DAY');
            flags.isHalfDay = leaves.some((l) => l.type === 'HALF_DAY_FIRST' || l.type === 'HALF_DAY_LAST');
            flags.hasShortLeave = leaves.some((l) => l.type === 'SHORT_LEAVE');
        }
        if (!shift || !checkInTime) {
            return flags;
        }
        const graceMinutes = shift.gracePeriodLate || 0;
        const shiftStartTime = this.parseTimeString(shift.startTime, checkInTime);
        const lateThreshold = new Date(shiftStartTime.getTime() + graceMinutes * 60 * 1000);
        flags.isLate = checkInTime > lateThreshold;
        if (checkOutTime) {
            const shiftEndTime = this.parseTimeString(shift.endTime, checkOutTime);
            const earlyThreshold = new Date(shiftEndTime.getTime() - graceMinutes * 60 * 1000);
            flags.isEarlyLeave = checkOutTime < earlyThreshold;
        }
        return flags;
    }
    shouldAutoCheckout(events, shift, currentTime) {
        if (!shift || !shift.autoClockOut) {
            return false;
        }
        const hasIn = events.some((e) => e.eventType === 'IN');
        const hasOut = events.some((e) => e.eventType === 'OUT');
        if (!hasIn || hasOut) {
            return false;
        }
        const firstIn = events.find((e) => e.eventType === 'IN');
        if (!firstIn) {
            return false;
        }
        const hoursSinceCheckIn = (currentTime.getTime() - firstIn.eventTime.getTime()) / (1000 * 60 * 60);
        return hoursSinceCheckIn > 12;
    }
    calculateAutoCheckoutTime(checkInTime, shift) {
        const shiftDurationMinutes = this.getShiftDurationMinutes(shift);
        return new Date(checkInTime.getTime() + shiftDurationMinutes * 60 * 1000);
    }
    determineWorkDayStatus(date, policy) {
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
        return workDayStatus;
    }
    async resolveHolidays(date, workCalendarId, payrollCalendarId) {
        let workHolidayId = null;
        let payrollHolidayId = null;
        if (!workCalendarId && !payrollCalendarId) {
            return { workHolidayId, payrollHolidayId };
        }
        if (workCalendarId === payrollCalendarId && workCalendarId) {
            const holiday = await this.findHoliday(date, workCalendarId, 'JOINT');
            if (holiday) {
                workHolidayId = holiday.id;
                payrollHolidayId = holiday.id;
            }
        }
        else {
            const [workHoliday, payrollHoliday] = await Promise.all([
                workCalendarId ? this.findHoliday(date, workCalendarId, 'WORK') : Promise.resolve(null),
                payrollCalendarId ? this.findHoliday(date, payrollCalendarId, 'PAYROLL') : Promise.resolve(null),
            ]);
            if (workHoliday)
                workHolidayId = workHoliday.id;
            if (payrollHoliday)
                payrollHolidayId = payrollHoliday.id;
        }
        return { workHolidayId, payrollHolidayId };
    }
    async findHoliday(date, calendarId, type) {
        if (!calendarId)
            return null;
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);
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
            this.logger.log(`[ATTENDANCE_LOGIC] ✅ Found ${type} Holiday: ${holiday.name} on ${date.toISOString().split('T')[0]}`);
        }
        else {
            this.logger.log(`[ATTENDANCE_LOGIC] ❌ No ${type} Holiday on ${date.toISOString().split('T')[0]} in calendar ${calendarId}`);
        }
        return holiday;
    }
    getShiftDurationMinutes(shift) {
        const start = this.parseTimeString(shift.startTime, new Date());
        const end = this.parseTimeString(shift.endTime, new Date());
        let duration = (end.getTime() - start.getTime()) / (1000 * 60);
        if (duration < 0) {
            duration += 24 * 60;
        }
        return duration;
    }
    parseTimeString(timeStr, referenceDate) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date(referenceDate);
        date.setHours(hours, minutes, 0, 0);
        return date;
    }
};
exports.AttendanceCalculationService = AttendanceCalculationService;
exports.AttendanceCalculationService = AttendanceCalculationService = AttendanceCalculationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttendanceCalculationService);
//# sourceMappingURL=attendance-calculation.service.js.map