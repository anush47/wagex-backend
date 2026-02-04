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
const employee_enum_1 = require("../../common/enums/employee.enum");
class CreateEmployeeDto {
    employeeNo;
    nic;
    nameWithInitials;
    fullName;
    designation;
    joinedDate;
    resignedDate;
    remark;
    address;
    phone;
    basicSalary;
    companyId;
    managerId;
    gender;
    employmentType;
}
exports.CreateEmployeeDto = CreateEmployeeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1001, description: 'Employee Number' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateEmployeeDto.prototype, "employeeNo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '199512345678', description: 'NIC' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "nic", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'J. Doe', description: 'Name with Initials' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "nameWithInitials", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Johnathan Samuel Doe', description: 'Full Name' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Software Engineer', description: 'Designation', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "designation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01', description: 'Joined Date', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "joinedDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-01-01', description: 'Resigned Date', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "resignedDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Excellent performance.', description: 'Remarks', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "remark", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'No. 123, Main Street, Colombo', description: 'Address', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+94771234567', description: 'Phone Number', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "phone", void 0);
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
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'manager-uuid', description: 'Manager ID', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "managerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: employee_enum_1.Gender, example: employee_enum_1.Gender.MALE }),
    (0, class_validator_1.IsEnum)(employee_enum_1.Gender),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: employee_enum_1.EmploymentType, example: employee_enum_1.EmploymentType.PERMANENT }),
    (0, class_validator_1.IsEnum)(employee_enum_1.EmploymentType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEmployeeDto.prototype, "employmentType", void 0);
//# sourceMappingURL=create-employee.dto.js.map