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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalariesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const salaries_service_1 = require("./salaries.service");
const salary_dto_1 = require("./dto/salary.dto");
let SalariesController = class SalariesController {
    salariesService;
    constructor(salariesService) {
        this.salariesService = salariesService;
    }
    generatePreview(dto) {
        return this.salariesService.generatePreviews(dto);
    }
    saveDrafts(drafts) {
        return this.salariesService.saveDrafts(drafts);
    }
    findAll(query) {
        return this.salariesService.findAll(query);
    }
    findOne(id) {
        return this.salariesService.findOne(id);
    }
};
exports.SalariesController = SalariesController;
__decorate([
    (0, common_1.Post)('generate-preview'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate salary previews without saving' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [salary_dto_1.GenerateSalaryDto]),
    __metadata("design:returntype", void 0)
], SalariesController.prototype, "generatePreview", null);
__decorate([
    (0, common_1.Post)('save-drafts'),
    (0, swagger_1.ApiOperation)({ summary: 'Save generated salary previews as drafts' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", void 0)
], SalariesController.prototype, "saveDrafts", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all salaries with filtering' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [salary_dto_1.SalaryQueryDto]),
    __metadata("design:returntype", void 0)
], SalariesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get salary by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SalariesController.prototype, "findOne", null);
exports.SalariesController = SalariesController = __decorate([
    (0, swagger_1.ApiTags)('salaries'),
    (0, common_1.Controller)('salaries'),
    __metadata("design:paramtypes", [salaries_service_1.SalariesService])
], SalariesController);
//# sourceMappingURL=salaries.controller.js.map