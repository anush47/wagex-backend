"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicySettingsDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const shifts_policy_dto_1 = require("./shifts-policy.dto");
const attendance_policy_dto_1 = require("./attendance-policy.dto");
const salary_components_policy_dto_1 = require("./salary-components-policy.dto");
const payroll_settings_policy_dto_1 = require("./payroll-settings-policy.dto");
const working_days_policy_dto_1 = require("./working-days-policy.dto");
const leaves_policy_dto_1 = require("./leaves-policy.dto");
__exportStar(require("./shifts-policy.dto"), exports);
__exportStar(require("./attendance-policy.dto"), exports);
__exportStar(require("./salary-components-policy.dto"), exports);
__exportStar(require("./payroll-settings-policy.dto"), exports);
__exportStar(require("./working-days-policy.dto"), exports);
__exportStar(require("./leaves-policy.dto"), exports);
class PolicySettingsDto {
    shifts;
    attendance;
    salaryComponents;
    payrollConfiguration;
    workingDays;
    leaves;
}
exports.PolicySettingsDto = PolicySettingsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: shifts_policy_dto_1.ShiftsConfigDto, description: 'Shifts configuration' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => shifts_policy_dto_1.ShiftsConfigDto),
    __metadata("design:type", shifts_policy_dto_1.ShiftsConfigDto)
], PolicySettingsDto.prototype, "shifts", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: attendance_policy_dto_1.AttendanceConfigDto, description: 'Attendance tracking, geofencing, and approval rules' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => attendance_policy_dto_1.AttendanceConfigDto),
    __metadata("design:type", attendance_policy_dto_1.AttendanceConfigDto)
], PolicySettingsDto.prototype, "attendance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: salary_components_policy_dto_1.SalaryComponentsConfigDto, description: 'Salary components (additions/deductions) configuration' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => salary_components_policy_dto_1.SalaryComponentsConfigDto),
    __metadata("design:type", salary_components_policy_dto_1.SalaryComponentsConfigDto)
], PolicySettingsDto.prototype, "salaryComponents", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: payroll_settings_policy_dto_1.PayrollSettingsConfigDto, description: 'Global payroll settings (cycles, dates, logic)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => payroll_settings_policy_dto_1.PayrollSettingsConfigDto),
    __metadata("design:type", payroll_settings_policy_dto_1.PayrollSettingsConfigDto)
], PolicySettingsDto.prototype, "payrollConfiguration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: working_days_policy_dto_1.WorkingDaysConfigDto, description: 'Working days configuration' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => working_days_policy_dto_1.WorkingDaysConfigDto),
    __metadata("design:type", working_days_policy_dto_1.WorkingDaysConfigDto)
], PolicySettingsDto.prototype, "workingDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: leaves_policy_dto_1.LeavesConfigDto, description: 'Leaves configuration' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => leaves_policy_dto_1.LeavesConfigDto),
    __metadata("design:type", leaves_policy_dto_1.LeavesConfigDto)
], PolicySettingsDto.prototype, "leaves", void 0);
//# sourceMappingURL=policy-settings.dto.js.map