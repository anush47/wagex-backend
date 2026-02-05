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
exports.CreateLeaveRequestDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const leave_enum_1 = require("../enums/leave.enum");
class CreateLeaveRequestDto {
    employeeId;
    companyId;
    leaveTypeId;
    type;
    startDate;
    endDate;
    reason;
    documents;
}
exports.CreateLeaveRequestDto = CreateLeaveRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'employee-uuid' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeaveRequestDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'company-uuid' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeaveRequestDto.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'leave-type-1', description: 'Leave type ID from policy' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeaveRequestDto.prototype, "leaveTypeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: leave_enum_1.LeaveRequestType, default: leave_enum_1.LeaveRequestType.FULL_DAY }),
    (0, class_validator_1.IsEnum)(leave_enum_1.LeaveRequestType),
    __metadata("design:type", String)
], CreateLeaveRequestDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-02-10T00:00:00Z', description: 'For Full/Half: date only. For Short Leave: include time (e.g., 2025-02-10T10:30:00Z)' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateLeaveRequestDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-02-12T00:00:00Z', description: 'For Full/Half: date only. For Short Leave: include time (e.g., 2025-02-10T12:00:00Z)' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateLeaveRequestDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Family emergency' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeaveRequestDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: 'array', items: { type: 'object' } }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateLeaveRequestDto.prototype, "documents", void 0);
//# sourceMappingURL=create-leave-request.dto.js.map