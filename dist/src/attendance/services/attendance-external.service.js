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
let AttendanceExternalService = AttendanceExternalService_1 = class AttendanceExternalService {
    prisma;
    processingService;
    logger = new common_1.Logger(AttendanceExternalService_1.name);
    constructor(prisma, processingService) {
        this.prisma = prisma;
        this.processingService = processingService;
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
    async createExternalEvent(dto, companyId, apiKeyName) {
        const employee = await this.prisma.employee.findFirst({
            where: {
                companyId,
                employeeNo: dto.employeeNo,
            },
        });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee ${dto.employeeNo} not found`);
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
        this.processingService.processEmployeeDate(employee.id, new Date(dto.eventTime))
            .catch(e => this.logger.error(`Processing error: ${e.message}`));
        return event;
    }
    async bulkCreateExternalEvents(dto, companyId, apiKeyName) {
        const uniqueEmployeeNos = [...new Set(dto.events.map(e => e.employeeNo).filter(Boolean))];
        const employees = await this.prisma.employee.findMany({
            where: { companyId, employeeNo: { in: uniqueEmployeeNos } },
            select: { id: true, employeeNo: true }
        });
        const empMap = new Map(employees.map(e => [e.employeeNo, e.id]));
        const results = [];
        const validEvents = [];
        const processQueue = new Set();
        for (const eventDto of dto.events) {
            const employeeId = empMap.get(eventDto.employeeNo);
            if (!employeeId) {
                results.push({ employeeNo: eventDto.employeeNo, status: 'failed', error: 'Employee not found' });
                continue;
            }
            const eventTime = new Date(eventDto.eventTime);
            validEvents.push({
                employeeId,
                companyId,
                eventTime,
                eventType: eventDto.eventType,
                source: 'API_KEY',
                apiKeyName,
                device: eventDto.device,
                location: eventDto.location,
                latitude: eventDto.latitude,
                longitude: eventDto.longitude,
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
            results: [...results, ...validEvents.map(e => ({ employeeNo: employees.find(emp => emp.id === e.employeeId)?.employeeNo, status: 'success' }))]
        };
    }
};
exports.AttendanceExternalService = AttendanceExternalService;
exports.AttendanceExternalService = AttendanceExternalService = AttendanceExternalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        attendance_processing_service_1.AttendanceProcessingService])
], AttendanceExternalService);
//# sourceMappingURL=attendance-external.service.js.map