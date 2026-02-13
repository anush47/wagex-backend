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
exports.CreateSalaryAdvanceDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class DeductionScheduleItemDto {
    periodStartDate;
    periodEndDate;
    amount;
}
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DeductionScheduleItemDto.prototype, "periodStartDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-31' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DeductionScheduleItemDto.prototype, "periodEndDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5000 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DeductionScheduleItemDto.prototype, "amount", void 0);
class CreateSalaryAdvanceDto {
    employeeId;
    companyId;
    totalAmount;
    date;
    reason;
    deductionSchedule;
    remarks;
}
exports.CreateSalaryAdvanceDto = CreateSalaryAdvanceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'employee-uuid' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSalaryAdvanceDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'company-uuid' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSalaryAdvanceDto.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 15000 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateSalaryAdvanceDto.prototype, "totalAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-10' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSalaryAdvanceDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Personal emergency' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSalaryAdvanceDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [DeductionScheduleItemDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => DeductionScheduleItemDto),
    __metadata("design:type", Array)
], CreateSalaryAdvanceDto.prototype, "deductionSchedule", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSalaryAdvanceDto.prototype, "remarks", void 0);
//# sourceMappingURL=create-advance.dto.js.map