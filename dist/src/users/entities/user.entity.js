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
exports.User = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class User {
    id;
    email;
    name;
    role;
    active;
    companyId;
    createdAt;
    updatedAt;
}
exports.User = User;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-1234', description: 'Unique identifier' }),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'user@example.com', description: 'Email address' }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John Doe', description: 'Full name', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.Role, example: client_1.Role.EMPLOYEE, description: 'User role' }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Is account active' }),
    __metadata("design:type", Boolean)
], User.prototype, "active", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'company-uuid', description: 'Company ID', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
//# sourceMappingURL=user.entity.js.map