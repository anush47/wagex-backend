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
exports.AdvancesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const advances_service_1 = require("./advances.service");
const create_advance_dto_1 = require("./dto/create-advance.dto");
let AdvancesController = class AdvancesController {
    advancesService;
    constructor(advancesService) {
        this.advancesService = advancesService;
    }
    create(dto) {
        return this.advancesService.create(dto);
    }
    findAll(companyId) {
        return this.advancesService.findAll(companyId);
    }
    findOne(id) {
        return this.advancesService.findOne(id);
    }
    approve(id) {
        return this.advancesService.approve(id);
    }
};
exports.AdvancesController = AdvancesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new salary advance' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_advance_dto_1.CreateSalaryAdvanceDto]),
    __metadata("design:returntype", void 0)
], AdvancesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all advances for a company' }),
    __param(0, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdvancesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get advance by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdvancesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve an advance' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdvancesController.prototype, "approve", null);
exports.AdvancesController = AdvancesController = __decorate([
    (0, swagger_1.ApiTags)('advances'),
    (0, common_1.Controller)('advances'),
    __metadata("design:paramtypes", [advances_service_1.AdvancesService])
], AdvancesController);
//# sourceMappingURL=advances.controller.js.map