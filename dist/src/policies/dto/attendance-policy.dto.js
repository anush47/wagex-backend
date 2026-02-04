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
exports.AttendanceConfigDto = exports.CompanyApiKeyDto = exports.ApprovalPolicyConfigDto = exports.ExceptionTriggersDto = exports.GeofencingConfigDto = exports.GeoZoneDto = exports.ApprovalPolicyMode = exports.GeofencingEnforcement = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
var GeofencingEnforcement;
(function (GeofencingEnforcement) {
    GeofencingEnforcement["STRICT"] = "STRICT";
    GeofencingEnforcement["FLAG_ONLY"] = "FLAG_ONLY";
    GeofencingEnforcement["NONE"] = "NONE";
})(GeofencingEnforcement || (exports.GeofencingEnforcement = GeofencingEnforcement = {}));
var ApprovalPolicyMode;
(function (ApprovalPolicyMode) {
    ApprovalPolicyMode["AUTO_APPROVE"] = "AUTO_APPROVE";
    ApprovalPolicyMode["REQUIRE_APPROVAL_ALL"] = "REQUIRE_APPROVAL_ALL";
    ApprovalPolicyMode["REQUIRE_APPROVAL_EXCEPTIONS"] = "REQUIRE_APPROVAL_EXCEPTIONS";
})(ApprovalPolicyMode || (exports.ApprovalPolicyMode = ApprovalPolicyMode = {}));
class GeoZoneDto {
    id;
    name;
    latitude;
    longitude;
    radius;
    address;
}
exports.GeoZoneDto = GeoZoneDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'zone-1' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeoZoneDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Head Office' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeoZoneDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GeoZoneDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GeoZoneDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100, description: 'Radius in meters' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GeoZoneDto.prototype, "radius", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123 Main St' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeoZoneDto.prototype, "address", void 0);
class GeofencingConfigDto {
    enabled;
    enforcement;
    zones;
}
exports.GeofencingConfigDto = GeofencingConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], GeofencingConfigDto.prototype, "enabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: GeofencingEnforcement }),
    (0, class_validator_1.IsEnum)(GeofencingEnforcement),
    __metadata("design:type", String)
], GeofencingConfigDto.prototype, "enforcement", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [GeoZoneDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => GeoZoneDto),
    __metadata("design:type", Array)
], GeofencingConfigDto.prototype, "zones", void 0);
class ExceptionTriggersDto {
    outsideZone;
    deviceMismatch;
    unrecognizedIp;
}
exports.ExceptionTriggersDto = ExceptionTriggersDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ExceptionTriggersDto.prototype, "outsideZone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ExceptionTriggersDto.prototype, "deviceMismatch", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ExceptionTriggersDto.prototype, "unrecognizedIp", void 0);
class ApprovalPolicyConfigDto {
    mode;
    exceptionTriggers;
}
exports.ApprovalPolicyConfigDto = ApprovalPolicyConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ApprovalPolicyMode }),
    (0, class_validator_1.IsEnum)(ApprovalPolicyMode),
    __metadata("design:type", String)
], ApprovalPolicyConfigDto.prototype, "mode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: ExceptionTriggersDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ExceptionTriggersDto),
    __metadata("design:type", ExceptionTriggersDto)
], ApprovalPolicyConfigDto.prototype, "exceptionTriggers", void 0);
class CompanyApiKeyDto {
    id;
    name;
    key;
    createdAt;
    lastUsedAt;
}
exports.CompanyApiKeyDto = CompanyApiKeyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'key-1' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompanyApiKeyDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Reception Kiosk' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompanyApiKeyDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompanyApiKeyDto.prototype, "key", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompanyApiKeyDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CompanyApiKeyDto.prototype, "lastUsedAt", void 0);
class AttendanceConfigDto {
    allowSelfCheckIn;
    requireLocation;
    requireDeviceInfo;
    geofencing;
    approvalPolicy;
    apiKeys;
}
exports.AttendanceConfigDto = AttendanceConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Allow employees to check in from their own devices' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AttendanceConfigDto.prototype, "allowSelfCheckIn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Require GPS location for check-in' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AttendanceConfigDto.prototype, "requireLocation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Capture device info (User-Agent, IP)' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AttendanceConfigDto.prototype, "requireDeviceInfo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: GeofencingConfigDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => GeofencingConfigDto),
    __metadata("design:type", GeofencingConfigDto)
], AttendanceConfigDto.prototype, "geofencing", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: ApprovalPolicyConfigDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ApprovalPolicyConfigDto),
    __metadata("design:type", ApprovalPolicyConfigDto)
], AttendanceConfigDto.prototype, "approvalPolicy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [CompanyApiKeyDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CompanyApiKeyDto),
    __metadata("design:type", Array)
], AttendanceConfigDto.prototype, "apiKeys", void 0);
//# sourceMappingURL=attendance-policy.dto.js.map