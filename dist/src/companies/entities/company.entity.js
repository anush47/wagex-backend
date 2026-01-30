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
exports.Company = void 0;
const swagger_1 = require("@nestjs/swagger");
class Company {
    id;
    name;
    active;
    createdAt;
    updatedAt;
}
exports.Company = Company;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-1234', description: 'Unique identifier' }),
    __metadata("design:type", String)
], Company.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'WageX Inc.', description: 'Company Name' }),
    __metadata("design:type", String)
], Company.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Is company active' }),
    __metadata("design:type", Boolean)
], Company.prototype, "active", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], Company.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], Company.prototype, "updatedAt", void 0);
//# sourceMappingURL=company.entity.js.map