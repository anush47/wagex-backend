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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarsController = void 0;
const common_1 = require("@nestjs/common");
const calendars_service_1 = require("./calendars.service");
const holiday_query_dto_1 = require("./dto/holiday-query.dto");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let CalendarsController = class CalendarsController {
    calendarsService;
    constructor(calendarsService) {
        this.calendarsService = calendarsService;
    }
    findAllCalendars() {
        return this.calendarsService.findAllCalendars();
    }
    findHolidays(query) {
        return this.calendarsService.findHolidays(query);
    }
    findOneCalendar(id) {
        return this.calendarsService.findOneCalendar(id);
    }
};
exports.CalendarsController = CalendarsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all global calendars' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CalendarsController.prototype, "findAllCalendars", null);
__decorate([
    (0, common_1.Get)('holidays'),
    (0, swagger_1.ApiOperation)({ summary: 'List holidays with filtering and pagination' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [holiday_query_dto_1.HolidayQueryDto]),
    __metadata("design:returntype", void 0)
], CalendarsController.prototype, "findHolidays", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific calendar details' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CalendarsController.prototype, "findOneCalendar", null);
exports.CalendarsController = CalendarsController = __decorate([
    (0, swagger_1.ApiTags)('Calendars & Holidays'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('calendars'),
    __metadata("design:paramtypes", [calendars_service_1.CalendarsService])
], CalendarsController);
//# sourceMappingURL=calendars.controller.js.map