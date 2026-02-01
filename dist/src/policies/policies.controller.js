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
exports.PoliciesController = void 0;
const common_1 = require("@nestjs/common");
const policies_service_1 = require("./policies.service");
const create_policy_dto_1 = require("./dto/create-policy.dto");
const update_policy_dto_1 = require("./dto/update-policy.dto");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../auth/roles.decorator");
const client_1 = require("@prisma/client");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const permissions_1 = require("../auth/permissions");
let PoliciesController = class PoliciesController {
    policiesService;
    constructor(policiesService) {
        this.policiesService = policiesService;
    }
    create(createPolicyDto) {
        return this.policiesService.create(createPolicyDto);
    }
    findByCompany(companyId) {
        return this.policiesService.findByCompany(companyId);
    }
    getEffective(employeeId) {
        return this.policiesService.getEffectivePolicyDetail(employeeId);
    }
    update(id, companyId, updatePolicyDto) {
        return this.policiesService.update(id, updatePolicyDto);
    }
    remove(id, companyId) {
        return this.policiesService.remove(id);
    }
    removeOverride(employeeId, companyId) {
        return this.policiesService.removeByEmployee(employeeId);
    }
};
exports.PoliciesController = PoliciesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.MANAGE_COMPANY),
    (0, swagger_1.ApiOperation)({ summary: 'Create policy' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_policy_dto_1.CreatePolicyDto]),
    __metadata("design:returntype", void 0)
], PoliciesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('company/:companyId'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER, client_1.Role.EMPLOYEE),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.VIEW_COMPANY),
    (0, swagger_1.ApiOperation)({ summary: 'Get company default policy' }),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PoliciesController.prototype, "findByCompany", null);
__decorate([
    (0, common_1.Get)('effective/:employeeId'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER, client_1.Role.EMPLOYEE),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.VIEW_COMPANY),
    (0, swagger_1.ApiOperation)({ summary: 'Get effective employee policy' }),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PoliciesController.prototype, "getEffective", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.MANAGE_COMPANY),
    (0, swagger_1.ApiOperation)({ summary: 'Update policy' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_policy_dto_1.UpdatePolicyDto]),
    __metadata("design:returntype", void 0)
], PoliciesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.MANAGE_COMPANY),
    (0, swagger_1.ApiOperation)({ summary: 'Delete policy' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PoliciesController.prototype, "remove", null);
__decorate([
    (0, common_1.Delete)('override/:employeeId'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.MANAGE_COMPANY),
    (0, swagger_1.ApiOperation)({ summary: 'Remove employee override' }),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PoliciesController.prototype, "removeOverride", null);
exports.PoliciesController = PoliciesController = __decorate([
    (0, swagger_1.ApiTags)('Policies'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('policies'),
    __metadata("design:paramtypes", [policies_service_1.PoliciesService])
], PoliciesController);
//# sourceMappingURL=policies.controller.js.map