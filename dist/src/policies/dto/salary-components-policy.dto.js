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
exports.SalaryComponentsConfigDto = exports.PayrollComponentDto = exports.PayrollComponentCategory = exports.PayrollComponentType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var PayrollComponentType;
(function (PayrollComponentType) {
    PayrollComponentType["FLAT_AMOUNT"] = "FLAT_AMOUNT";
    PayrollComponentType["PERCENTAGE_BASIC"] = "PERCENTAGE_BASIC";
    PayrollComponentType["PERCENTAGE_GROSS"] = "PERCENTAGE_GROSS";
})(PayrollComponentType || (exports.PayrollComponentType = PayrollComponentType = {}));
var PayrollComponentCategory;
(function (PayrollComponentCategory) {
    PayrollComponentCategory["ADDITION"] = "ADDITION";
    PayrollComponentCategory["DEDUCTION"] = "DEDUCTION";
})(PayrollComponentCategory || (exports.PayrollComponentCategory = PayrollComponentCategory = {}));
class PayrollComponentDto {
    id;
    name;
    category;
    type;
    value;
    isStatutory;
    affectsTotalEarnings;
    minCap;
    maxCap;
}
exports.PayrollComponentDto = PayrollComponentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'comp-1' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PayrollComponentDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Performance Bonus' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PayrollComponentDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PayrollComponentCategory }),
    (0, class_validator_1.IsEnum)(PayrollComponentCategory),
    __metadata("design:type", String)
], PayrollComponentDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PayrollComponentType }),
    (0, class_validator_1.IsEnum)(PayrollComponentType),
    __metadata("design:type", String)
], PayrollComponentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5000 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PayrollComponentDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PayrollComponentDto.prototype, "isStatutory", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Does this component affect the total reportable earnings?' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PayrollComponentDto.prototype, "affectsTotalEarnings", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Minimum limit amount if percentage based' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PayrollComponentDto.prototype, "minCap", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Maximum limit amount if percentage based' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PayrollComponentDto.prototype, "maxCap", void 0);
class SalaryComponentsConfigDto {
    components;
}
exports.SalaryComponentsConfigDto = SalaryComponentsConfigDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [PayrollComponentDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PayrollComponentDto),
    __metadata("design:type", Array)
], SalaryComponentsConfigDto.prototype, "components", void 0);
//# sourceMappingURL=salary-components-policy.dto.js.map