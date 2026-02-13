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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AttendanceManualController_1, AttendanceExternalController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceExternalController = exports.AttendanceManualController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const attendance_manual_service_1 = require("./services/attendance-manual.service");
const attendance_query_service_1 = require("./services/attendance-query.service");
const attendance_external_service_1 = require("./services/attendance-external.service");
const event_dto_1 = require("./dto/event.dto");
const session_dto_1 = require("./dto/session.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const public_decorator_1 = require("../auth/public.decorator");
const client_1 = require("@prisma/client");
let AttendanceManualController = AttendanceManualController_1 = class AttendanceManualController {
    manualService;
    queryService;
    logger = new common_1.Logger(AttendanceManualController_1.name);
    constructor(manualService, queryService) {
        this.manualService = manualService;
        this.queryService = queryService;
    }
    async createEvent(createEventDto) {
        this.logger.log(`Creating manual event for employee ${createEventDto.employeeId}`);
        const event = await this.manualService.createManualEvent(createEventDto, 'MANUAL');
        return {
            success: true,
            event: {
                id: event.id,
                employeeId: event.employeeId,
                eventTime: event.eventTime.toISOString(),
                eventType: event.eventType,
                status: event.status,
            },
        };
    }
    async createSession(dto) {
        return this.manualService.createManualSession(dto);
    }
    async getSessions(query) {
        return this.queryService.getSessions(query);
    }
    async getSession(id) {
        return this.queryService.getSession(id);
    }
    async getSessionEvents(id) {
        return this.queryService.getSessionEvents(id);
    }
    async getEvents(query) {
        return this.queryService.getEvents(query);
    }
    async updateSession(id, dto) {
        return this.manualService.updateSession(id, dto);
    }
    async deleteSession(id) {
        return this.manualService.deleteSession(id);
    }
    async linkEventToSession(eventId, sessionId) {
        await this.manualService.linkEventToSession(eventId, sessionId);
        return { success: true };
    }
    async unlinkEventFromSession(eventId) {
        await this.manualService.unlinkEventFromSession(eventId);
        return { success: true };
    }
};
exports.AttendanceManualController = AttendanceManualController;
__decorate([
    (0, common_1.Post)('events'),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create manual attendance event' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Event created successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [event_dto_1.CreateEventDto]),
    __metadata("design:returntype", Promise)
], AttendanceManualController.prototype, "createEvent", null);
__decorate([
    (0, common_1.Post)('sessions'),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create manual attendance session' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_dto_1.CreateSessionDto]),
    __metadata("design:returntype", Promise)
], AttendanceManualController.prototype, "createSession", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get attendance sessions (paginated)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_dto_1.SessionQueryDto]),
    __metadata("design:returntype", Promise)
], AttendanceManualController.prototype, "getSessions", null);
__decorate([
    (0, common_1.Get)('sessions/:id'),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get single attendance session by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AttendanceManualController.prototype, "getSession", null);
__decorate([
    (0, common_1.Get)('sessions/:id/events'),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get events for a specific attendance session' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AttendanceManualController.prototype, "getSessionEvents", null);
__decorate([
    (0, common_1.Get)('events'),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get attendance events (paginated)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [session_dto_1.EventQueryDto]),
    __metadata("design:returntype", Promise)
], AttendanceManualController.prototype, "getEvents", null);
__decorate([
    (0, common_1.Patch)('sessions/:id'),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update attendance session' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, session_dto_1.UpdateSessionDto]),
    __metadata("design:returntype", Promise)
], AttendanceManualController.prototype, "updateSession", null);
__decorate([
    (0, common_1.Delete)('sessions/:id'),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Delete attendance session' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AttendanceManualController.prototype, "deleteSession", null);
__decorate([
    (0, common_1.Post)('events/:eventId/link/:sessionId'),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Link an event to a session manually' }),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AttendanceManualController.prototype, "linkEventToSession", null);
__decorate([
    (0, common_1.Delete)('events/:eventId/link'),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Unlink an event from its session' }),
    __param(0, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AttendanceManualController.prototype, "unlinkEventFromSession", null);
exports.AttendanceManualController = AttendanceManualController = AttendanceManualController_1 = __decorate([
    (0, swagger_1.ApiTags)('Attendance - Manual'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('attendance/manual'),
    __metadata("design:paramtypes", [attendance_manual_service_1.AttendanceManualService,
        attendance_query_service_1.AttendanceQueryService])
], AttendanceManualController);
let AttendanceExternalController = AttendanceExternalController_1 = class AttendanceExternalController {
    externalService;
    logger = new common_1.Logger(AttendanceExternalController_1.name);
    constructor(externalService) {
        this.externalService = externalService;
    }
    async verifyApiKey(apiKey) {
        if (!apiKey)
            throw new common_1.UnauthorizedException('API key required');
        const result = await this.externalService.verifyApiKey(apiKey);
        if (!result.valid)
            throw new common_1.UnauthorizedException('Invalid API key');
        return result;
    }
    async createEvent(apiKey, dto) {
        if (!apiKey)
            throw new common_1.UnauthorizedException('API key required');
        const verification = await this.externalService.verifyApiKey(apiKey);
        if (!verification.valid || !verification.company || !verification.apiKey) {
            throw new common_1.UnauthorizedException('Invalid API key');
        }
        const event = await this.externalService.createExternalEvent(dto, verification);
        return {
            success: true,
            event: {
                id: event.id,
                employeeId: event.employeeId,
                employeeName: event.employeeName,
                shiftName: event.shiftName,
                eventTime: event.eventTime.toISOString(),
                eventType: event.eventType,
                status: event.status,
            },
        };
    }
    async bulkCreateEvents(apiKey, dto) {
        if (!apiKey)
            throw new common_1.UnauthorizedException('API key required');
        const verification = await this.externalService.verifyApiKey(apiKey);
        if (!verification.valid || !verification.company || !verification.apiKey) {
            throw new common_1.UnauthorizedException('Invalid API key');
        }
        return this.externalService.bulkCreateExternalEvents(dto, verification);
    }
};
exports.AttendanceExternalController = AttendanceExternalController;
__decorate([
    (0, common_1.Get)('verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify API key' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'API key is valid' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid API key' }),
    __param(0, (0, common_1.Headers)('x-api-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AttendanceExternalController.prototype, "verifyApiKey", null);
__decorate([
    (0, common_1.Post)('event'),
    (0, swagger_1.ApiOperation)({ summary: 'Insert single attendance event' }),
    __param(0, (0, common_1.Headers)('x-api-key')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, event_dto_1.CreateEventDto]),
    __metadata("design:returntype", Promise)
], AttendanceExternalController.prototype, "createEvent", null);
__decorate([
    (0, common_1.Post)('events/bulk'),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk insert attendance events' }),
    __param(0, (0, common_1.Headers)('x-api-key')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, event_dto_1.BulkCreateEventsDto]),
    __metadata("design:returntype", Promise)
], AttendanceExternalController.prototype, "bulkCreateEvents", null);
exports.AttendanceExternalController = AttendanceExternalController = AttendanceExternalController_1 = __decorate([
    (0, swagger_1.ApiTags)('Attendance - External API'),
    (0, public_decorator_1.Public)(),
    (0, common_1.Controller)('attendance/external'),
    __metadata("design:paramtypes", [attendance_external_service_1.AttendanceExternalService])
], AttendanceExternalController);
//# sourceMappingURL=attendance.controller.js.map