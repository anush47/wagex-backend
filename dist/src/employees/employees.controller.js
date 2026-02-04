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
var EmployeesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeesController = void 0;
const common_1 = require("@nestjs/common");
const employees_service_1 = require("./employees.service");
const create_employee_dto_1 = require("./dto/create-employee.dto");
const update_employee_dto_1 = require("./dto/update-employee.dto");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../auth/roles.decorator");
const client_1 = require("@prisma/client");
const permissions_1 = require("../auth/permissions");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const query_dto_1 = require("../common/dto/query.dto");
let EmployeesController = EmployeesController_1 = class EmployeesController {
    employeesService;
    logger = new common_1.Logger(EmployeesController_1.name);
    constructor(employeesService) {
        this.employeesService = employeesService;
    }
    async create(createEmployeeDto, req) {
        const user = req.user;
        if (user.role === client_1.Role.EMPLOYER) {
            const hasAccess = user.memberships?.some((m) => m.companyId === createEmployeeDto.companyId);
            if (!hasAccess) {
                throw new common_1.ForbiddenException('You do not have access to this company.');
            }
        }
        return this.employeesService.create(createEmployeeDto);
    }
    findAll(queryDto, req) {
        return this.employeesService.findAll(queryDto.companyId, queryDto, req.user);
    }
    async findOne(id, req) {
        const user = req.user;
        const employee = await this.employeesService.findOne(id);
        if (user.role === client_1.Role.EMPLOYER) {
            const hasAccess = user.memberships?.some((m) => m.companyId === employee.companyId);
            if (!hasAccess) {
                throw new common_1.ForbiddenException('You do not have access to this employee.');
            }
        }
        return employee;
    }
    async update(id, updateEmployeeDto, req) {
        const user = req.user;
        const employee = await this.employeesService.findOne(id);
        if (user.role === client_1.Role.EMPLOYER) {
            const hasAccess = user.memberships?.some((m) => m.companyId === employee.companyId);
            if (!hasAccess) {
                throw new common_1.ForbiddenException('You do not have access to this employee.');
            }
            if (updateEmployeeDto.companyId &&
                updateEmployeeDto.companyId !== employee.companyId) {
                const hasNewAccess = user.memberships?.some((m) => m.companyId === updateEmployeeDto.companyId);
                if (!hasNewAccess) {
                    throw new common_1.ForbiddenException('You do not have access to the target company.');
                }
            }
        }
        return this.employeesService.update(id, updateEmployeeDto);
    }
    async remove(id, req) {
        const user = req.user;
        const employee = await this.employeesService.findOne(id);
        if (user.role === client_1.Role.EMPLOYER) {
            const hasAccess = user.memberships?.some((m) => m.companyId === employee.companyId);
            if (!hasAccess) {
                throw new common_1.ForbiddenException('You do not have access to this employee.');
            }
        }
        return this.employeesService.remove(id);
    }
    async provisionUser(id, req) {
        const user = req.user;
        const employee = await this.employeesService.findOne(id);
        if (user.role === client_1.Role.EMPLOYER) {
            const hasAccess = user.memberships?.some(m => m.companyId === employee.companyId);
            if (!hasAccess) {
                throw new common_1.ForbiddenException('You do not have access to this employee.');
            }
        }
        return this.employeesService.provisionUser(id);
    }
    async deprovisionUser(id, req) {
        const user = req.user;
        const employee = await this.employeesService.findOne(id);
        if (user.role === client_1.Role.EMPLOYER) {
            const hasAccess = user.memberships?.some(m => m.companyId === employee.companyId);
            if (!hasAccess) {
                throw new common_1.ForbiddenException('You do not have access to this employee.');
            }
        }
        return this.employeesService.deprovisionUser(id);
    }
};
exports.EmployeesController = EmployeesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.MANAGE_EMPLOYEES),
    (0, swagger_1.ApiOperation)({ summary: 'Create employee' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Employee created.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_employee_dto_1.CreateEmployeeDto, Object]),
    __metadata("design:returntype", Promise)
], EmployeesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.MANAGE_EMPLOYEES),
    (0, swagger_1.ApiOperation)({ summary: 'List employees' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Return employees.' }),
    (0, swagger_1.ApiQuery)({ name: 'companyId', required: false, type: String }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_dto_1.QueryDto, Object]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, swagger_1.ApiOperation)({ summary: 'Get employee by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Return employee.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, swagger_1.ApiOperation)({ summary: 'Update employee' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Employee updated.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_employee_dto_1.UpdateEmployeeDto, Object]),
    __metadata("design:returntype", Promise)
], EmployeesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.MANAGE_EMPLOYEES),
    (0, swagger_1.ApiOperation)({ summary: 'Delete employee' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Employee deleted.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/provision-user'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.MANAGE_EMPLOYEES),
    (0, swagger_1.ApiOperation)({ summary: 'Provision user account for employee' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User created/linked.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeesController.prototype, "provisionUser", null);
__decorate([
    (0, common_1.Delete)(':id/provision-user'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EMPLOYER),
    (0, permissions_decorator_1.Permissions)(permissions_1.Permission.MANAGE_EMPLOYEES),
    (0, swagger_1.ApiOperation)({ summary: 'Unlink user account from employee' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User unlinked.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeesController.prototype, "deprovisionUser", null);
exports.EmployeesController = EmployeesController = EmployeesController_1 = __decorate([
    (0, swagger_1.ApiTags)('Employees'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('employees'),
    __metadata("design:paramtypes", [employees_service_1.EmployeesService])
], EmployeesController);
//# sourceMappingURL=employees.controller.js.map