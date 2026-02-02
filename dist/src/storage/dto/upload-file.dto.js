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
exports.UploadFileDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UploadFileDto {
    file;
    folder;
    companyId;
    employeeId;
    customFilename;
}
exports.UploadFileDto = UploadFileDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: 'string', format: 'binary', description: 'File to upload' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UploadFileDto.prototype, "file", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Target folder (e.g., "logos", "documents")', default: 'general', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadFileDto.prototype, "folder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Company ID context', type: 'string', format: 'uuid', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UploadFileDto.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Employee ID context', type: 'string', format: 'uuid', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UploadFileDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Custom filename (without extension)', type: 'string', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadFileDto.prototype, "customFilename", void 0);
//# sourceMappingURL=upload-file.dto.js.map