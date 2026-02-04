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
exports.Employee = void 0;
const swagger_1 = require("@nestjs/swagger");
const employee_enum_1 = require("../../common/enums/employee.enum");
class Employee {
    id;
    employeeNo;
    nic;
    nameWithInitials;
    fullName;
    designation;
    joinedDate;
    resignedDate;
    remark;
    phone;
    address;
    email;
    basicSalary;
    status;
    companyId;
    managerId;
    userId;
    gender;
    employmentType;
    allowLogin;
    createdAt;
    updatedAt;
}
exports.Employee = Employee;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-1234', description: 'Unique identifier' }),
    __metadata("design:type", String)
], Employee.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1001, description: 'Employee Number' }),
    __metadata("design:type", Number)
], Employee.prototype, "employeeNo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '199512345678', description: 'NIC' }),
    __metadata("design:type", Object)
], Employee.prototype, "nic", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'J. Doe', description: 'Name with Initials' }),
    __metadata("design:type", String)
], Employee.prototype, "nameWithInitials", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Johnathan Doe', description: 'Full Name' }),
    __metadata("design:type", String)
], Employee.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Software Engineer', description: 'Designation', nullable: true }),
    __metadata("design:type", Object)
], Employee.prototype, "designation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01', description: 'Joined Date' }),
    __metadata("design:type", Date)
], Employee.prototype, "joinedDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-01-01', description: 'Resigned Date', nullable: true }),
    __metadata("design:type", Object)
], Employee.prototype, "resignedDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Good standing.', description: 'Remarks', nullable: true }),
    __metadata("design:type", Object)
], Employee.prototype, "remark", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+94771234567', description: 'Phone Number', nullable: true }),
    __metadata("design:type", Object)
], Employee.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123 Main St, Colombo', description: 'Address', nullable: true }),
    __metadata("design:type", Object)
], Employee.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'jane@company.com', description: 'Employee Email', nullable: true }),
    __metadata("design:type", Object)
], Employee.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 50000.0, description: 'Basic Salary' }),
    __metadata("design:type", Number)
], Employee.prototype, "basicSalary", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ACTIVE', description: 'Employment Status' }),
    __metadata("design:type", String)
], Employee.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'company-uuid', description: 'Company ID' }),
    __metadata("design:type", String)
], Employee.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'manager-uuid', description: 'Manager ID', nullable: true }),
    __metadata("design:type", Object)
], Employee.prototype, "managerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'user-uuid', description: 'Linked User ID', nullable: true }),
    __metadata("design:type", Object)
], Employee.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: employee_enum_1.Gender, example: employee_enum_1.Gender.MALE }),
    __metadata("design:type", String)
], Employee.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: employee_enum_1.EmploymentType, example: employee_enum_1.EmploymentType.PERMANENT }),
    __metadata("design:type", String)
], Employee.prototype, "employmentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], Employee.prototype, "allowLogin", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], Employee.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], Employee.prototype, "updatedAt", void 0);
//# sourceMappingURL=employee.entity.js.map