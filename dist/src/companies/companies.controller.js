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
var CompaniesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompaniesController = void 0;
const common_1 = require("@nestjs/common");
const companies_service_1 = require("./companies.service");
const create_company_dto_1 = require("./dto/create-company.dto");
const update_company_dto_1 = require("./dto/update-company.dto");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../auth/roles.decorator");
const client_1 = require("@prisma/client");
const permissions_1 = require("../auth/permissions");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const query_dto_1 = require("../common/dto/query.dto");
let CompaniesController = CompaniesController_1 = class CompaniesController {
    companiesService;
    logger = new common_1.Logger(CompaniesController_1.name);
    constructor(companiesService) {
        this.companiesService = companiesService;
    }
    async create(createCompanyDto, req) {
        const user = req.user;
        this.logger.log(`${user.role} creating company: ${createCompanyDto.name}`);
        if (user.role === client_1.Role.EMPLOYER) {
            return this.companiesService.createWithMembership(createCompanyDto, user.id);
        }
        return this.companiesService.create(createCompanyDto);
    }
    async findAll(req, queryDto) {
        const user = req.user;
        if (user.role === client_1.Role.ADMIN) {
            return this.companiesService.findAll(queryDto);
        }
        if (user.role === client_1.Role.EMPLOYER) {
            const companyIds = user.memberships?.map(m => m.companyId) || [];
            return this.companiesService.findByIds(companyIds, queryDto);
        }
        return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
    async findOne(id, req) {
        const user = req.user;
        if (user.role === client_1.Role.EMPLOYER) {
            const hasAccess = user.memberships?.some(m => m.companyId === id);
            if (!hasAccess) {
                this.logger.warn(`Unauthorized company access attempt by user ${user.id} for company ${id}`);
                throw new common_1.ForbiddenException('You do not have access to this company.');
            }
        }
        return this.companiesService.findOne(id);
    }
    async update(id, updateCompanyDto, req) {
        const user = req.user;
        if (user.role === client_1.Role.EMPLOYER) {
            const hasAccess = user.memberships?.some(m => m.companyId === id);
            if (!hasAccess) {
                this.logger.warn(`Unauthorized company update attempt by user ${user.id} for company ${id}`);
                throw new common_1.ForbiddenException('You do not have access to this company.');
            }
        }
        return this.companiesService.update(id, updateCompanyDto);
    }
    async remove(id, req) {
        const user = req.user;
        if (user.role === client_1.Role.EMPLOYER) {
            const hasAccess = user.memberships?.some(m => m.companyId === id);
            if (!hasAccess) {
                this.logger.warn(`Unauthorized company delete attempt by user ${user.id} for company ${id}`);
                throw new common_1.ForbiddenException('You do not have access to this company.');
            }
        }
        this.logger.log(`${user.role} deleting company: ${id}`);
        return this.companiesService.remove(id);
    }
};
exports.CompaniesController = CompaniesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, swagger_1.ApiOperation)({ summary: 'Create company' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Company created.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_company_dto_1.CreateCompanyDto, Object]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, swagger_1.ApiOperation)({ summary: 'List companies' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Return companies (all for admin, own for employer).' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, query_dto_1.QueryDto]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.VIEW_COMPANY),
    (0, swagger_1.ApiOperation)({ summary: 'Get company by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Return company.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.EDIT_COMPANY),
    (0, swagger_1.ApiOperation)({ summary: 'Update company' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company updated.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_company_dto_1.UpdateCompanyDto, Object]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.MANAGE_COMPANY),
    (0, swagger_1.ApiOperation)({ summary: 'Delete company' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company deleted.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "remove", null);
exports.CompaniesController = CompaniesController = CompaniesController_1 = __decorate([
    (0, swagger_1.ApiTags)('Companies'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('companies'),
    __metadata("design:paramtypes", [companies_service_1.CompaniesService])
], CompaniesController);
//# sourceMappingURL=companies.controller.js.map