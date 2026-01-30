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
exports.BaseUserProfileDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class BaseUserProfileDto {
    nameWithInitials;
    fullName;
    address;
    phone;
}
exports.BaseUserProfileDto = BaseUserProfileDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'J. Doe', description: 'Name with Initials' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BaseUserProfileDto.prototype, "nameWithInitials", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John Doe', description: 'Full Name' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BaseUserProfileDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123 Main St, Springfield', description: 'Residential Address', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BaseUserProfileDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+1 555 123 4567', description: 'Phone Number', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BaseUserProfileDto.prototype, "phone", void 0);
//# sourceMappingURL=base-user-profile.dto.js.map