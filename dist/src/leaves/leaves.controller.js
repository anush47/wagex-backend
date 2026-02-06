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
var LeavesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeavesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const leaves_service_1 = require("./leaves.service");
const create_leave_request_dto_1 = require("./dto/create-leave-request.dto");
const update_leave_request_dto_1 = require("./dto/update-leave-request.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const client_1 = require("@prisma/client");
const leave_enum_1 = require("./enums/leave.enum");
let LeavesController = LeavesController_1 = class LeavesController {
    leavesService;
    logger = new common_1.Logger(LeavesController_1.name);
    constructor(leavesService) {
        this.leavesService = leavesService;
    }
    create(createLeaveRequestDto) {
        this.logger.log(`Creating leave request for employee ${createLeaveRequestDto.employeeId}`);
        return this.leavesService.createRequest(createLeaveRequestDto);
    }
    getBalances(employeeId) {
        this.logger.log(`Fetching balances for employee ${employeeId}`);
        return this.leavesService.getBalances(employeeId);
    }
    findAll(companyId, status, employeeId) {
        this.logger.log(`Fetching leave requests for company ${companyId}`);
        return this.leavesService.findAll(companyId, { status, employeeId });
    }
    findOne(id) {
        this.logger.log(`Fetching leave request ${id}`);
        return this.leavesService.findOne(id);
    }
    update(id, updateLeaveRequestDto) {
        this.logger.log(`Updating leave request ${id}`);
        return this.leavesService.updateRequest(id, updateLeaveRequestDto);
    }
    delete(id) {
        this.logger.log(`Deleting leave request ${id}`);
        return this.leavesService.deleteRequest(id);
    }
};
exports.LeavesController = LeavesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new leave request' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Leave request created successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_leave_request_dto_1.CreateLeaveRequestDto]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('balances/:employeeId'),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.EMPLOYEE, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get leave balances for an employee' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Leave balances retrieved successfully' }),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "getBalances", null);
__decorate([
    (0, common_1.Get)('company/:companyId'),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all leave requests for a company' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Leave requests retrieved successfully' }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.EMPLOYEE, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single leave request' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Leave request retrieved successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update leave request (approve/reject)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Leave request updated successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_leave_request_dto_1.UpdateLeaveRequestDto]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.EMPLOYER, client_1.Role.EMPLOYEE, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a pending leave request' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Leave request deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Cannot delete non-pending leave request' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Not authorized to delete this request' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "delete", null);
exports.LeavesController = LeavesController = LeavesController_1 = __decorate([
    (0, swagger_1.ApiTags)('Leaves'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('leaves'),
    __metadata("design:paramtypes", [leaves_service_1.LeavesService])
], LeavesController);
//# sourceMappingURL=leaves.controller.js.map