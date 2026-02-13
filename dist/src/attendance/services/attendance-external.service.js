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
var AttendanceExternalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceExternalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const attendance_processing_service_1 = require("./attendance-processing.service");
const shift_selection_service_1 = require("./shift-selection.service");
let AttendanceExternalService = AttendanceExternalService_1 = class AttendanceExternalService {
    prisma;
    processingService;
    shiftSelectionService;
    logger = new common_1.Logger(AttendanceExternalService_1.name);
    constructor(prisma, processingService, shiftSelectionService) {
        this.prisma = prisma;
        this.processingService = processingService;
        this.shiftSelectionService = shiftSelectionService;
    }
    apiKeyCache = new Map();
    CACHE_TTL = 5 * 60 * 1000;
    async verifyApiKey(apiKey) {
        const cached = this.apiKeyCache.get(apiKey);
        if (cached && cached.expiresAt > Date.now()) {
            this.throttleLastUsedUpdate(apiKey, cached.result.policyId);
            return cached.result;
        }
        try {
            const queryValue = JSON.stringify([{ key: apiKey }]);
            const results = await this.prisma.$queryRaw `
                SELECT 
                    p.id as "policyId",
                    p.settings,
                    p."companyId",
                    p."employeeId",
                    c.name as "companyName",
                    c."employerNumber",
                    e.id as "empRecordId",
                    e."nameWithInitials" as "empName",
                    e."employeeNo",
                    e."companyId" as "empCompanyId",
                    ec.name as "empCompanyName",
                    ec."employerNumber" as "empCompanyNumber"
                FROM public.policies p
                LEFT JOIN public.companies c ON p."companyId" = c.id
                LEFT JOIN public.employees e ON p."employeeId" = e.id
                LEFT JOIN public.companies ec ON e."companyId" = ec.id
                WHERE (p.settings -> 'attendance' -> 'apiKeys') @> ${queryValue}::jsonb
                LIMIT 1
            `;
            if (!results || results.length === 0) {
                return { valid: false };
            }
            const policy = results[0];
            const settings = policy.settings;
            const keyConfig = settings.attendance?.apiKeys?.find((k) => k.key === apiKey);
            if (!keyConfig || keyConfig.enabled === false) {
                return { valid: false };
            }
            let result = { valid: false };
            if (policy.companyId) {
                result = {
                    valid: true,
                    type: 'COMPANY',
                    policyId: policy.policyId,
                    company: {
                        id: policy.companyId,
                        name: policy.companyName,
                        employerNumber: policy.employerNumber,
                    },
                    apiKey: {
                        id: keyConfig.id,
                        name: keyConfig.name,
                        lastUsedAt: new Date(),
                    },
                };
            }
            else if (policy.employeeId) {
                result = {
                    valid: true,
                    type: 'EMPLOYEE',
                    policyId: policy.policyId,
                    company: {
                        id: policy.empCompanyId,
                        name: policy.empCompanyName,
                        employerNumber: policy.empCompanyNumber,
                    },
                    employee: {
                        id: policy.empRecordId,
                        name: policy.empName,
                        employeeNo: policy.employeeNo,
                    },
                    apiKey: {
                        id: keyConfig.id,
                        name: keyConfig.name,
                        lastUsedAt: new Date(),
                    },
                };
            }
            if (result.valid) {
                this.apiKeyCache.set(apiKey, {
                    result,
                    expiresAt: Date.now() + this.CACHE_TTL
                });
                this.throttleLastUsedUpdate(apiKey, policy.policyId);
            }
            return result;
        }
        catch (error) {
            this.logger.error(`Database error during API key verification: ${error.message}`);
        }
        return { valid: false };
    }
    lastUpdateMap = new Map();
    async throttleLastUsedUpdate(apiKey, policyId) {
        const now = Date.now();
        const lastUpdate = this.lastUpdateMap.get(apiKey) || 0;
        if (now - lastUpdate < 30 * 60 * 1000)
            return;
        this.lastUpdateMap.set(apiKey, now);
        try {
            await this.prisma.$executeRaw `
                UPDATE public.policies
                SET settings = jsonb_set(
                    settings,
                    '{attendance,apiKeys}',
                    (
                        SELECT jsonb_agg(
                            CASE 
                                WHEN elem->>'key' = ${apiKey} 
                                THEN jsonb_set(elem, '{lastUsedAt}', to_jsonb(${new Date().toISOString()}::text))
                                ELSE elem 
                            END
                        )
                        FROM jsonb_array_elements(settings->'attendance'->'apiKeys') AS elem
                    )
                )
                WHERE id = ${policyId}
            `;
        }
        catch (e) {
            this.logger.error(`Failed to update lastUsedAt for key: ${e.message}`);
        }
    }
    async createExternalEvent(dto, verification) {
        const companyId = verification.company.id;
        const apiKeyName = verification.apiKey.name;
        if (verification.type === 'EMPLOYEE' && verification.employee) {
            if (dto.employeeNo !== undefined && dto.employeeNo !== verification.employee.employeeNo) {
                throw new common_1.UnauthorizedException(`This API key is restricted to Employee #${verification.employee.employeeNo}. Cannot mark attendance for #${dto.employeeNo}.`);
            }
            dto.employeeId = verification.employee.id;
        }
        let employeeId = dto.employeeId;
        let employeeName = verification.employee?.name;
        if (!employeeId) {
            const employee = await this.prisma.employee.findFirst({
                where: {
                    companyId,
                    employeeNo: dto.employeeNo,
                },
                select: { id: true, nameWithInitials: true }
            });
            if (!employee) {
                throw new common_1.NotFoundException(`Employee #${dto.employeeNo} not found in this company.`);
            }
            employeeId = employee.id;
            employeeName = employee.nameWithInitials;
        }
        else if (!employeeName) {
            const employee = await this.prisma.employee.findUnique({
                where: { id: employeeId },
                select: { nameWithInitials: true }
            });
            employeeName = employee?.nameWithInitials;
        }
        const eventTime = new Date(dto.eventTime);
        let eventType = dto.eventType;
        if (!eventType) {
            const decision = await this.determineEventType(employeeId, eventTime);
            if (decision.autoCheckoutAt) {
                await this.prisma.attendanceEvent.create({
                    data: {
                        employeeId: employeeId,
                        companyId,
                        eventTime: decision.autoCheckoutAt,
                        eventType: 'OUT',
                        source: 'MANUAL',
                        remark: 'Auto checkout on shift end',
                        status: 'ACTIVE',
                        sessionId: decision.sessionId,
                    },
                });
                eventType = 'IN';
            }
            else {
                eventType = decision.type;
            }
        }
        const shift = await this.shiftSelectionService.getEffectiveShift(employeeId, eventTime, eventTime);
        const shiftName = shift?.name || 'No Shift Assigned';
        const event = await this.prisma.attendanceEvent.create({
            data: {
                employeeId: employeeId,
                companyId,
                eventTime,
                eventType: eventType,
                source: 'API_KEY',
                apiKeyName,
                device: dto.device,
                location: dto.location,
                latitude: dto.latitude,
                longitude: dto.longitude,
                remark: dto.remark,
                status: 'ACTIVE',
            },
        });
        this.processingService.processEmployeeDate(employeeId, eventTime)
            .catch(e => this.logger.error(`Processing error: ${e.message}`));
        return {
            ...event,
            employeeName: employeeName || 'Unknown',
            shiftName,
        };
    }
    async determineEventType(employeeId, eventTime, lastEventContext) {
        let lastEvent = lastEventContext;
        if (!lastEvent) {
            const dbLastEvent = await this.prisma.attendanceEvent.findFirst({
                where: { employeeId, status: 'ACTIVE' },
                orderBy: { eventTime: 'desc' },
                select: { eventTime: true, eventType: true, sessionId: true }
            });
            if (dbLastEvent) {
                lastEvent = {
                    eventTime: new Date(dbLastEvent.eventTime),
                    eventType: dbLastEvent.eventType,
                    sessionId: dbLastEvent.sessionId
                };
            }
        }
        if (!lastEvent || lastEvent.eventType === 'OUT') {
            return { type: 'IN' };
        }
        const lastEventTime = lastEvent.eventTime;
        const diffMs = eventTime.getTime() - lastEventTime.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const lastShift = await this.shiftSelectionService.getEffectiveShift(employeeId, lastEventTime);
        let maxOutDate = null;
        if (lastShift?.maxOutTime) {
            const [maxH, maxM] = lastShift.maxOutTime.split(':').map(Number);
            maxOutDate = new Date(lastEventTime);
            maxOutDate.setHours(maxH, maxM, 0, 0);
            if (maxOutDate < lastEventTime) {
                maxOutDate.setDate(maxOutDate.getDate() + 1);
            }
        }
        const isPast24h = diffHours >= 24;
        const isPastMaxOut = lastShift && maxOutDate && eventTime > maxOutDate;
        if (lastShift && (isPast24h || isPastMaxOut)) {
            if (lastShift.autoClockOut && lastShift.endTime) {
                let autoCheckoutAt = new Date(lastEventTime);
                const [h, m] = lastShift.endTime.split(':').map(Number);
                autoCheckoutAt.setHours(h, m, 0, 0);
                if (autoCheckoutAt < lastEventTime) {
                    autoCheckoutAt.setDate(autoCheckoutAt.getDate() + 1);
                }
                if (autoCheckoutAt >= eventTime) {
                    autoCheckoutAt = new Date(eventTime.getTime() - 1000);
                }
                return { type: 'IN', autoCheckoutAt, sessionId: lastEvent.sessionId };
            }
            return { type: 'IN' };
        }
        if (isPast24h) {
            return { type: 'IN' };
        }
        return { type: 'OUT' };
    }
    async bulkCreateExternalEvents(dto, verification) {
        const companyId = verification.company.id;
        const apiKeyName = verification.apiKey.name;
        const sortedEvents = [...dto.events].sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());
        const uniqueEmployeeNos = [...new Set(sortedEvents.map(e => e.employeeNo).filter(Boolean))];
        const employees = await this.prisma.employee.findMany({
            where: { companyId, employeeNo: { in: uniqueEmployeeNos } },
            select: { id: true, employeeNo: true }
        });
        const empMap = new Map(employees.map(e => [e.employeeNo, e.id]));
        const results = [];
        const validEvents = [];
        const processQueue = new Set();
        const lastStateMap = new Map();
        for (const eventDto of sortedEvents) {
            let decision;
            if (verification.type === 'EMPLOYEE' && verification.employee) {
                if (eventDto.employeeNo !== undefined && eventDto.employeeNo !== verification.employee.employeeNo) {
                    results.push({
                        employeeNo: eventDto.employeeNo,
                        status: 'failed',
                        error: `This API key is restricted to Employee #${verification.employee.employeeNo}.`
                    });
                    continue;
                }
            }
            const employeeId = empMap.get(eventDto.employeeNo);
            if (!employeeId) {
                results.push({ employeeNo: eventDto.employeeNo, status: 'failed', error: 'Employee not found' });
                continue;
            }
            const eventTime = new Date(eventDto.eventTime);
            let eventType = eventDto.eventType;
            if (!eventType) {
                const lastInBatch = lastStateMap.get(employeeId);
                decision = await this.determineEventType(employeeId, eventTime, lastInBatch);
                if (decision.autoCheckoutAt) {
                    const autoOut = {
                        employeeId,
                        companyId,
                        eventTime: decision.autoCheckoutAt,
                        eventType: 'OUT',
                        source: 'MANUAL',
                        remark: 'Auto checkout on shift end',
                        status: 'ACTIVE',
                        sessionId: decision.sessionId,
                    };
                    validEvents.push(autoOut);
                    lastStateMap.set(employeeId, {
                        eventTime: decision.autoCheckoutAt,
                        eventType: 'OUT',
                        sessionId: decision.sessionId
                    });
                    eventType = 'IN';
                }
                else {
                    eventType = decision.type;
                }
            }
            lastStateMap.set(employeeId, {
                eventTime,
                eventType: eventType,
                sessionId: eventType === 'IN' ? null : decision?.sessionId
            });
            validEvents.push({
                employeeId,
                companyId,
                eventTime,
                eventType: eventType,
                source: 'API_KEY',
                apiKeyName,
                device: eventDto.device,
                location: eventDto.location,
                latitude: eventDto.latitude,
                longitude: eventDto.longitude,
                remark: eventDto.remark,
                status: 'ACTIVE',
            });
            const dateStr = eventTime.toISOString().split('T')[0];
            processQueue.add(`${employeeId}:${dateStr}`);
        }
        if (validEvents.length > 0) {
            await this.prisma.attendanceEvent.createMany({ data: validEvents });
        }
        processQueue.forEach(item => {
            const [empId, dateStr] = item.split(':');
            this.processingService.processEmployeeDate(empId, new Date(dateStr))
                .catch(e => this.logger.error(`Bulk processing error: ${e.message}`));
        });
        return {
            success: true,
            inserted: validEvents.length,
            failed: results.filter(r => r.status === 'failed').length,
            results: [
                ...results,
                ...validEvents.map(e => ({
                    employeeNo: employees.find(emp => emp.id === e.employeeId)?.employeeNo,
                    status: 'success'
                }))
            ]
        };
    }
};
exports.AttendanceExternalService = AttendanceExternalService;
exports.AttendanceExternalService = AttendanceExternalService = AttendanceExternalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        attendance_processing_service_1.AttendanceProcessingService,
        shift_selection_service_1.ShiftSelectionService])
], AttendanceExternalService);
//# sourceMappingURL=attendance-external.service.js.map