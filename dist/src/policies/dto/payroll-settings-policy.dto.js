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
exports.PayrollSettingsConfigDto = exports.LateDeductionType = exports.UnpaidLeaveAction = exports.PayrollCalculationMethod = exports.PayCycleFrequency = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var PayCycleFrequency;
(function (PayCycleFrequency) {
    PayCycleFrequency["MONTHLY"] = "MONTHLY";
    PayCycleFrequency["SEMI_MONTHLY"] = "SEMI_MONTHLY";
    PayCycleFrequency["BI_WEEKLY"] = "BI_WEEKLY";
    PayCycleFrequency["WEEKLY"] = "WEEKLY";
    PayCycleFrequency["DAILY"] = "DAILY";
})(PayCycleFrequency || (exports.PayCycleFrequency = PayCycleFrequency = {}));
var PayrollCalculationMethod;
(function (PayrollCalculationMethod) {
    PayrollCalculationMethod["HOURLY_ATTENDANCE_WITH_OT"] = "HOURLY_ATTENDANCE_WITH_OT";
    PayrollCalculationMethod["SHIFT_ATTENDANCE_WITH_OT"] = "SHIFT_ATTENDANCE_WITH_OT";
    PayrollCalculationMethod["SHIFT_ATTENDANCE_FLAT"] = "SHIFT_ATTENDANCE_FLAT";
    PayrollCalculationMethod["DAILY_ATTENDANCE_FLAT"] = "DAILY_ATTENDANCE_FLAT";
    PayrollCalculationMethod["FIXED_MONTHLY_SALARY"] = "FIXED_MONTHLY_SALARY";
})(PayrollCalculationMethod || (exports.PayrollCalculationMethod = PayrollCalculationMethod = {}));
var UnpaidLeaveAction;
(function (UnpaidLeaveAction) {
    UnpaidLeaveAction["DEDUCT_FROM_TOTAL"] = "DEDUCT_FROM_TOTAL";
    UnpaidLeaveAction["ADD_AS_DEDUCTION"] = "ADD_AS_DEDUCTION";
})(UnpaidLeaveAction || (exports.UnpaidLeaveAction = UnpaidLeaveAction = {}));
var LateDeductionType;
(function (LateDeductionType) {
    LateDeductionType["DIVISOR_BASED"] = "DIVISOR_BASED";
    LateDeductionType["FIXED_AMOUNT"] = "FIXED_AMOUNT";
})(LateDeductionType || (exports.LateDeductionType = LateDeductionType = {}));
class PayrollSettingsConfigDto {
    frequency;
    runDay;
    runDayAnchor;
    cutoffDaysBeforePayDay;
    calculationMethod;
    baseRateDivisor;
    autoDeductUnpaidLeaves;
    unpaidLeaveAction;
    lateDeductionType;
    lateDeductionValue;
}
exports.PayrollSettingsConfigDto = PayrollSettingsConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PayCycleFrequency, example: PayCycleFrequency.MONTHLY }),
    (0, class_validator_1.IsEnum)(PayCycleFrequency),
    __metadata("design:type", String)
], PayrollSettingsConfigDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'LAST', description: 'Day pattern: "1"-"31", "LAST", "MON"-"SUN"' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PayrollSettingsConfigDto.prototype, "runDay", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-01-01', description: 'Reference date for Bi-Weekly cycles' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PayrollSettingsConfigDto.prototype, "runDayAnchor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5, description: 'Days before PayDay to close attendance' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PayrollSettingsConfigDto.prototype, "cutoffDaysBeforePayDay", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PayrollCalculationMethod, example: PayrollCalculationMethod.FIXED_MONTHLY_SALARY }),
    (0, class_validator_1.IsEnum)(PayrollCalculationMethod),
    __metadata("design:type", String)
], PayrollSettingsConfigDto.prototype, "calculationMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 30, description: 'Divisor for rate calculation (30, 26, 22)' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PayrollSettingsConfigDto.prototype, "baseRateDivisor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Automatically deduct for unpaid leaves/absences' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PayrollSettingsConfigDto.prototype, "autoDeductUnpaidLeaves", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: UnpaidLeaveAction, example: UnpaidLeaveAction.DEDUCT_FROM_TOTAL }),
    (0, class_validator_1.IsEnum)(UnpaidLeaveAction),
    __metadata("design:type", String)
], PayrollSettingsConfigDto.prototype, "unpaidLeaveAction", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: LateDeductionType, example: LateDeductionType.DIVISOR_BASED }),
    (0, class_validator_1.IsEnum)(LateDeductionType),
    __metadata("design:type", String)
], PayrollSettingsConfigDto.prototype, "lateDeductionType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 8, description: 'Divisor (e.g. 8 hours) or Fixed Amount' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PayrollSettingsConfigDto.prototype, "lateDeductionValue", void 0);
//# sourceMappingURL=payroll-settings-policy.dto.js.map