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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkingDaysConfigDto = exports.DailyWorkConfigDto = exports.CalendarType = exports.HalfDayShift = exports.WorkDayType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var WorkDayType;
(function (WorkDayType) {
    WorkDayType["FULL"] = "FULL";
    WorkDayType["HALF"] = "HALF";
    WorkDayType["OFF"] = "OFF";
})(WorkDayType || (exports.WorkDayType = WorkDayType = {}));
var HalfDayShift;
(function (HalfDayShift) {
    HalfDayShift["FIRST"] = "FIRST";
    HalfDayShift["LAST"] = "LAST";
})(HalfDayShift || (exports.HalfDayShift = HalfDayShift = {}));
var CalendarType;
(function (CalendarType) {
    CalendarType["SL_DEFAULT"] = "sl_default";
})(CalendarType || (exports.CalendarType = CalendarType = {}));
class DailyWorkConfigDto {
    type;
    halfDayShift;
}
exports.DailyWorkConfigDto = DailyWorkConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: WorkDayType }),
    (0, class_validator_1.IsEnum)(WorkDayType),
    __metadata("design:type", String)
], DailyWorkConfigDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: HalfDayShift }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(HalfDayShift),
    __metadata("design:type", String)
], DailyWorkConfigDto.prototype, "halfDayShift", void 0);
class WorkingDaysConfigDto {
    defaultPattern;
    isDynamic;
    workingCalendar;
    payrollCalendar;
}
exports.WorkingDaysConfigDto = WorkingDaysConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Default generic pattern for standard week (MON-SUN)' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], WorkingDaysConfigDto.prototype, "defaultPattern", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Enable week-specific override patterns' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], WorkingDaysConfigDto.prototype, "isDynamic", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID of the selected working calendar', default: CalendarType.SL_DEFAULT, enum: CalendarType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CalendarType),
    __metadata("design:type", String)
], WorkingDaysConfigDto.prototype, "workingCalendar", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID of the selected payroll calendar', default: CalendarType.SL_DEFAULT, enum: CalendarType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CalendarType),
    __metadata("design:type", String)
], WorkingDaysConfigDto.prototype, "payrollCalendar", void 0);
//# sourceMappingURL=working-days-policy.dto.js.map