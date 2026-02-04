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
exports.DepartmentsController = void 0;
const common_1 = require("@nestjs/common");
const departments_service_1 = require("./departments.service");
const create_department_dto_1 = require("./dto/create-department.dto");
const update_department_dto_1 = require("./dto/update-department.dto");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../auth/roles.decorator");
const client_1 = require("@prisma/client");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const permissions_1 = require("../auth/permissions");
let DepartmentsController = class DepartmentsController {
    departmentsService;
    constructor(departmentsService) {
        this.departmentsService = departmentsService;
    }
    async create(createDepartmentDto, req) {
        const user = req.user;
        if (user.role === client_1.Role.EMPLOYER) {
            const hasAccess = user.memberships?.some(m => m.companyId === createDepartmentDto.companyId);
            if (!hasAccess) {
                throw new common_1.ForbiddenException('You do not have access to this company.');
            }
        }
        return this.departmentsService.create(createDepartmentDto);
    }
    async findAll(companyId, req) {
        const user = req.user;
        if (user.role !== client_1.Role.ADMIN) {
            const hasAccess = user.memberships?.some(m => m.companyId === companyId);
            if (!hasAccess) {
                throw new common_1.ForbiddenException('You do not have access to this company.');
            }
        }
        return this.departmentsService.findAll(companyId);
    }
    async findOne(id, req) {
        const dept = await this.departmentsService.findOne(id);
        const user = req.user;
        if (user.role !== client_1.Role.ADMIN) {
            const hasAccess = user.memberships?.some(m => m.companyId === dept.companyId);
            if (!hasAccess)
                throw new common_1.ForbiddenException('Access denied');
        }
        return dept;
    }
    async update(id, updateDepartmentDto, req) {
        const dept = await this.departmentsService.findOne(id);
        const user = req.user;
        if (user.role === client_1.Role.EMPLOYER) {
            const hasAccess = user.memberships?.some(m => m.companyId === dept.companyId);
            if (!hasAccess)
                throw new common_1.ForbiddenException('Access denied');
            if (updateDepartmentDto.companyId && updateDepartmentDto.companyId !== dept.companyId) {
                const targetAccess = user.memberships?.some(m => m.companyId === updateDepartmentDto.companyId);
                if (!targetAccess)
                    throw new common_1.ForbiddenException('Access denied to target company');
            }
        }
        return this.departmentsService.update(id, updateDepartmentDto);
    }
    async remove(id, req) {
        const dept = await this.departmentsService.findOne(id);
        const user = req.user;
        if (user.role === client_1.Role.EMPLOYER) {
            const hasAccess = user.memberships?.some(m => m.companyId === dept.companyId);
            if (!hasAccess)
                throw new common_1.ForbiddenException('Access denied');
        }
        return this.departmentsService.remove(id);
    }
};
exports.DepartmentsController = DepartmentsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.MANAGE_COMPANY),
    (0, swagger_1.ApiOperation)({ summary: 'Create department' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Department created.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_department_dto_1.CreateDepartmentDto, Object]),
    __metadata("design:returntype", Promise)
], DepartmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER, client_1.Role.EMPLOYEE),
    (0, swagger_1.ApiOperation)({ summary: 'List departments' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Return all departments for company.' }),
    (0, swagger_1.ApiQuery)({ name: 'companyId', required: true, type: String }),
    __param(0, (0, common_1.Query)('companyId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DepartmentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER, client_1.Role.EMPLOYEE),
    (0, swagger_1.ApiOperation)({ summary: 'Get department details' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DepartmentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.MANAGE_COMPANY),
    (0, swagger_1.ApiOperation)({ summary: 'Update department' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_department_dto_1.UpdateDepartmentDto, Object]),
    __metadata("design:returntype", Promise)
], DepartmentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.MANAGE_COMPANY),
    (0, swagger_1.ApiOperation)({ summary: 'Delete department' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DepartmentsController.prototype, "remove", null);
exports.DepartmentsController = DepartmentsController = __decorate([
    (0, swagger_1.ApiTags)('Departments'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('departments'),
    __metadata("design:paramtypes", [departments_service_1.DepartmentsService])
], DepartmentsController);
//# sourceMappingURL=departments.controller.js.map