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
exports.BulkEventResponseDto = exports.BulkEventResultDto = exports.EventResponseDto = exports.BulkCreateEventsDto = exports.CreateEventDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateEventDto {
    employeeId;
    employeeNo;
    eventTime;
    eventType;
    device;
    location;
    latitude;
    longitude;
    remark;
}
exports.CreateEventDto = CreateEventDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Employee ID (for manual/web entries)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Employee number (for API key entries)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateEventDto.prototype, "employeeNo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Event timestamp in ISO format', example: '2026-02-07T08:30:00Z' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "eventTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.EventType, description: 'Event type: IN or OUT' }),
    (0, class_validator_1.IsEnum)(client_1.EventType),
    __metadata("design:type", String)
], CreateEventDto.prototype, "eventType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Device name/identifier' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "device", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Location description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Latitude coordinate' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateEventDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Longitude coordinate' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateEventDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Additional remarks' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEventDto.prototype, "remark", void 0);
class BulkCreateEventsDto {
    events;
}
exports.BulkCreateEventsDto = BulkCreateEventsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [CreateEventDto], description: 'Array of events to insert' }),
    __metadata("design:type", Array)
], BulkCreateEventsDto.prototype, "events", void 0);
class EventResponseDto {
    id;
    employeeNo;
    employeeName;
    eventTime;
    eventType;
    shiftName;
    status;
}
exports.EventResponseDto = EventResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], EventResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], EventResponseDto.prototype, "employeeNo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], EventResponseDto.prototype, "employeeName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], EventResponseDto.prototype, "eventTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.EventType }),
    __metadata("design:type", String)
], EventResponseDto.prototype, "eventType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], EventResponseDto.prototype, "shiftName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], EventResponseDto.prototype, "status", void 0);
class BulkEventResultDto {
    employeeNo;
    status;
    eventId;
    error;
}
exports.BulkEventResultDto = BulkEventResultDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], BulkEventResultDto.prototype, "employeeNo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BulkEventResultDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BulkEventResultDto.prototype, "eventId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], BulkEventResultDto.prototype, "error", void 0);
class BulkEventResponseDto {
    success;
    inserted;
    failed;
    results;
}
exports.BulkEventResponseDto = BulkEventResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], BulkEventResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], BulkEventResponseDto.prototype, "inserted", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], BulkEventResponseDto.prototype, "failed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [BulkEventResultDto] }),
    __metadata("design:type", Array)
], BulkEventResponseDto.prototype, "results", void 0);
//# sourceMappingURL=event.dto.js.map