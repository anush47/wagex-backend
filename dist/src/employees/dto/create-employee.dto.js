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
exports.CreateEmployeeDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateEmployeeDto {
    employeeNo;
    name;
    basicSalary;
    companyId;
}
exports.CreateEmployeeDto = CreateEmployeeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'EMP-001', description: 'Employee Number' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "employeeNo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Jane Doe', description: 'Full Name' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 50000.0, description: 'Basic Salary' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateEmployeeDto.prototype, "basicSalary", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'company-uuid', description: 'Company ID to assign employee to' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "companyId", void 0);
//# sourceMappingURL=create-employee.dto.js.map