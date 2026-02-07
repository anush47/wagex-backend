"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AttendanceCalculationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceCalculationService = void 0;
const common_1 = require("@nestjs/common");
let AttendanceCalculationService = AttendanceCalculationService_1 = class AttendanceCalculationService {
    logger = new common_1.Logger(AttendanceCalculationService_1.name);
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
    (0, common_1.Injectable)()
], AttendanceCalculationService);
//# sourceMappingURL=attendance-calculation.service.js.map