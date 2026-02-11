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
var SessionGroupingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionGroupingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let SessionGroupingService = SessionGroupingService_1 = class SessionGroupingService {
    prisma;
    logger = new common_1.Logger(SessionGroupingService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async groupEventsIntoSessions(employeeId, events, referenceDate) {
        const sortedEvents = [...events].sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());
        const sessionGroups = this.groupEventsByTimeProximity(sortedEvents);
        const sessionGroupsProcessed = sessionGroups.map(group => {
            const sessionData = this.processEventGroup(group, referenceDate);
            return sessionData;
        });
        return sessionGroupsProcessed;
    }
    groupEventsByTimeProximity(events) {
        const groups = [];
        if (events.length === 0)
            return groups;
        let currentGroup = [events[0]];
        for (let i = 1; i < events.length; i++) {
            const prevEvent = events[i - 1];
            const currentEvent = events[i];
            const gapMs = currentEvent.eventTime.getTime() - prevEvent.eventTime.getTime();
            const gapHours = gapMs / (1000 * 60 * 60);
            let shouldSplit = false;
            if (gapHours > 24) {
                shouldSplit = true;
            }
            else if (prevEvent.eventType === 'OUT' && currentEvent.eventType === 'IN' && gapHours > 10) {
                shouldSplit = true;
            }
            else if (prevEvent.eventType === currentEvent.eventType && gapHours > 12) {
                shouldSplit = true;
            }
            else if (prevEvent.eventType === 'IN' && currentEvent.eventType === 'OUT' && gapHours > 28) {
                shouldSplit = true;
            }
            if (shouldSplit) {
                groups.push(currentGroup);
                currentGroup = [currentEvent];
            }
            else {
                currentGroup.push(currentEvent);
            }
        }
        groups.push(currentGroup);
        return groups;
    }
    processEventGroup(events, referenceDate) {
        const sortedEvents = [...events].sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());
        const inEvents = sortedEvents.filter(e => e.eventType === 'IN');
        const outEvents = sortedEvents.filter(e => e.eventType === 'OUT');
        const firstIn = inEvents.length > 0 ? inEvents[0].eventTime : null;
        const lastOut = outEvents.length > 0 ? outEvents[outEvents.length - 1].eventTime : null;
        const additionalInOutPairs = [];
        if (firstIn && lastOut) {
            for (let i = 0; i < sortedEvents.length - 1; i++) {
                const current = sortedEvents[i];
                const next = sortedEvents[i + 1];
                if (current.eventType === 'OUT' && next.eventType === 'IN' &&
                    current.eventTime >= firstIn && next.eventTime <= lastOut) {
                    additionalInOutPairs.push({ in: current.eventTime, out: next.eventTime });
                }
            }
        }
        const sessionDate = firstIn
            ? new Date(Date.UTC(firstIn.getUTCFullYear(), firstIn.getUTCMonth(), firstIn.getUTCDate()))
            : new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
        this.logger.log(`[GROUPING] Processed group: start=${firstIn?.toISOString()}, end=${lastOut?.toISOString()}, pairs=${additionalInOutPairs.length}`);
        return { events: sortedEvents, firstIn, lastOut, additionalInOutPairs, sessionDate };
    }
    async getEventsForSessionGrouping(employeeId, referenceDate) {
        const startDate = new Date(referenceDate);
        startDate.setUTCHours(0, 0, 0, 0);
        startDate.setUTCDate(startDate.getUTCDate() - 1);
        const endDate = new Date(referenceDate);
        endDate.setUTCHours(23, 59, 59, 999);
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        return this.prisma.attendanceEvent.findMany({
            where: {
                employeeId,
                eventTime: {
                    gte: startDate,
                    lte: endDate,
                },
                status: 'ACTIVE',
            },
            orderBy: {
                eventTime: 'asc',
            },
        });
    }
};
exports.SessionGroupingService = SessionGroupingService;
exports.SessionGroupingService = SessionGroupingService = SessionGroupingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SessionGroupingService);
//# sourceMappingURL=session-grouping.service.js.map