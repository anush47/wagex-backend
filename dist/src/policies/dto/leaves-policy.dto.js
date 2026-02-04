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
exports.LeavesConfigDto = exports.LeaveTypeDto = exports.PolicyGenderTarget = exports.EncashmentType = exports.AccrualFrequency = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const employee_enum_1 = require("../../common/enums/employee.enum");
var AccrualFrequency;
(function (AccrualFrequency) {
    AccrualFrequency["WEEKLY"] = "WEEKLY";
    AccrualFrequency["MONTHLY"] = "MONTHLY";
    AccrualFrequency["QUARTERLY"] = "QUARTERLY";
    AccrualFrequency["HALF_YEARLY"] = "HALF_YEARLY";
    AccrualFrequency["YEARLY"] = "YEARLY";
    AccrualFrequency["CUSTOM"] = "CUSTOM";
})(AccrualFrequency || (exports.AccrualFrequency = AccrualFrequency = {}));
var EncashmentType;
(function (EncashmentType) {
    EncashmentType["MULTIPLIER_BASED"] = "MULTIPLIER_BASED";
    EncashmentType["FIXED_AMOUNT"] = "FIXED_AMOUNT";
})(EncashmentType || (exports.EncashmentType = EncashmentType = {}));
var PolicyGenderTarget;
(function (PolicyGenderTarget) {
    PolicyGenderTarget["MALE"] = "MALE";
    PolicyGenderTarget["FEMALE"] = "FEMALE";
    PolicyGenderTarget["ALL"] = "ALL";
})(PolicyGenderTarget || (exports.PolicyGenderTarget = PolicyGenderTarget = {}));
class LeaveTypeDto {
    id;
    name;
    code;
    applicableGender;
    applicableEmploymentTypes;
    requiresApproval;
    approvalRequiredIfConsecutiveMoreThan;
    isShortLeave;
    maxDurationMinutes;
    baseAmount;
    accrualFrequency;
    customFrequencyDays;
    minDelayBetweenRequestsDays;
    canApplyBackdated;
    maxConsecutiveDays;
    requireDocuments;
    requireDocumentsIfConsecutiveMoreThan;
    canCarryOver;
    maxCarryOverDays;
    isEncashable;
    encashmentType;
    encashmentMultiplier;
    fixedAmount;
}
exports.LeaveTypeDto = LeaveTypeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'leave-1' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LeaveTypeDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Annual Leave' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LeaveTypeDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'AL' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LeaveTypeDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PolicyGenderTarget, default: PolicyGenderTarget.ALL }),
    (0, class_validator_1.IsEnum)(PolicyGenderTarget),
    __metadata("design:type", String)
], LeaveTypeDto.prototype, "applicableGender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: employee_enum_1.EmploymentType, isArray: true, example: [employee_enum_1.EmploymentType.PERMANENT] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(employee_enum_1.EmploymentType, { each: true }),
    __metadata("design:type", Array)
], LeaveTypeDto.prototype, "applicableEmploymentTypes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ default: true }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], LeaveTypeDto.prototype, "requiresApproval", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 3, description: 'Approval required if consecutive days exceed this' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], LeaveTypeDto.prototype, "approvalRequiredIfConsecutiveMoreThan", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ default: false }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], LeaveTypeDto.prototype, "isShortLeave", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 90, description: 'Max duration in minutes if short leave' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], LeaveTypeDto.prototype, "maxDurationMinutes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 14 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], LeaveTypeDto.prototype, "baseAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: AccrualFrequency, default: AccrualFrequency.YEARLY }),
    (0, class_validator_1.IsEnum)(AccrualFrequency),
    __metadata("design:type", String)
], LeaveTypeDto.prototype, "accrualFrequency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 15, description: 'Interval in days if frequency is CUSTOM' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], LeaveTypeDto.prototype, "customFrequencyDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 30, description: 'Minimum days between two requests of this type' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], LeaveTypeDto.prototype, "minDelayBetweenRequestsDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: false, description: 'Allow applying for past dates' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], LeaveTypeDto.prototype, "canApplyBackdated", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 5, description: 'Max consecutive days allowed for this leave' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], LeaveTypeDto.prototype, "maxConsecutiveDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: false, description: 'Require supporting documents (medical, etc)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], LeaveTypeDto.prototype, "requireDocuments", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 2, description: 'Require documents if consecutive days exceed this' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], LeaveTypeDto.prototype, "requireDocumentsIfConsecutiveMoreThan", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ default: false }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], LeaveTypeDto.prototype, "canCarryOver", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 5 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], LeaveTypeDto.prototype, "maxCarryOverDays", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ default: false }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], LeaveTypeDto.prototype, "isEncashable", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: EncashmentType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(EncashmentType),
    __metadata("design:type", String)
], LeaveTypeDto.prototype, "encashmentType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1.0, description: 'Multiplier for (Basic / Divisor)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], LeaveTypeDto.prototype, "encashmentMultiplier", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1000 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], LeaveTypeDto.prototype, "fixedAmount", void 0);
class LeavesConfigDto {
    leaveTypes;
}
exports.LeavesConfigDto = LeavesConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [LeaveTypeDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => LeaveTypeDto),
    __metadata("design:type", Array)
], LeavesConfigDto.prototype, "leaveTypes", void 0);
//# sourceMappingURL=leaves-policy.dto.js.map