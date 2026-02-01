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
exports.PolicySettingsDto = exports.ShiftsConfigDto = exports.ShiftDto = exports.ShiftSelectionPolicy = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var ShiftSelectionPolicy;
(function (ShiftSelectionPolicy) {
    ShiftSelectionPolicy["FIXED"] = "FIXED";
    ShiftSelectionPolicy["CLOSEST_START_TIME"] = "CLOSEST_START_TIME";
    ShiftSelectionPolicy["ROSTER"] = "ROSTER";
    ShiftSelectionPolicy["MANUAL"] = "MANUAL";
})(ShiftSelectionPolicy || (exports.ShiftSelectionPolicy = ShiftSelectionPolicy = {}));
class ShiftDto {
    id;
    name;
    startTime;
    endTime;
    minStartTime;
    maxOutTime;
    breakTime;
    gracePeriodLate;
    gracePeriodEarly;
    useShiftStartAsClockIn;
    autoClockOut;
}
exports.ShiftDto = ShiftDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'shift-1', description: 'Unique ID for the shift' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShiftDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Standard Morning', description: 'Display name of the shift' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShiftDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '08:00', description: 'Shift start time (HH:mm)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShiftDto.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '17:00', description: 'Shift end time (HH:mm)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShiftDto.prototype, "endTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '07:30', description: 'Earliest allowed clock-in' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShiftDto.prototype, "minStartTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '19:00', description: 'Latest allowed clock-out' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShiftDto.prototype, "maxOutTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 60, description: 'Break duration in minutes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ShiftDto.prototype, "breakTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 15, description: 'Minutes allowed after startTime before marked late' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ShiftDto.prototype, "gracePeriodLate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 10, description: 'Minutes allowed before endTime before marked early leave' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ShiftDto.prototype, "gracePeriodEarly", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Use shift start time as clock-in time if early' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ShiftDto.prototype, "useShiftStartAsClockIn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false, description: 'Automatically clock out at maxOutTime' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ShiftDto.prototype, "autoClockOut", void 0);
class ShiftsConfigDto {
    list;
    defaultShiftId;
    selectionPolicy;
}
exports.ShiftsConfigDto = ShiftsConfigDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [ShiftDto], description: 'List of available shifts' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ShiftDto),
    __metadata("design:type", Array)
], ShiftsConfigDto.prototype, "list", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'shift-1', description: 'Default shift ID to use' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShiftsConfigDto.prototype, "defaultShiftId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ShiftSelectionPolicy, description: 'How to select the active shift' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ShiftSelectionPolicy),
    __metadata("design:type", String)
], ShiftsConfigDto.prototype, "selectionPolicy", void 0);
class PolicySettingsDto {
    shifts;
    attendance;
    payroll;
}
exports.PolicySettingsDto = PolicySettingsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: ShiftsConfigDto, description: 'Shifts configuration' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ShiftsConfigDto),
    __metadata("design:type", ShiftsConfigDto)
], PolicySettingsDto.prototype, "shifts", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Attendance configuration' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], PolicySettingsDto.prototype, "attendance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Payroll configuration' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], PolicySettingsDto.prototype, "payroll", void 0);
//# sourceMappingURL=policy-settings.dto.js.map