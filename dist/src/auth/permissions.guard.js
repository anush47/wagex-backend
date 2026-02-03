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
var PermissionsGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const permissions_decorator_1 = require("./permissions.decorator");
const client_1 = require("@prisma/client");
let PermissionsGuard = PermissionsGuard_1 = class PermissionsGuard {
    reflector;
    logger = new common_1.Logger(PermissionsGuard_1.name);
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const requiredPermissions = this.reflector.getAllAndOverride(permissions_decorator_1.PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user)
            return false;
        if (user.role === client_1.Role.ADMIN)
            return true;
        const query = request.query || {};
        const params = request.params || {};
        const body = request.body || {};
        const companyId = query.companyId || params.companyId || body.companyId || params.id;
        if (!companyId) {
            if (request.method === 'GET') {
                return true;
            }
            this.logger.warn(`Permission check failed: companyId is required for ${user.role} on ${request.method} ${request.url}`);
            throw new common_1.ForbiddenException('companyId is required for permission-protected operations.');
        }
        const membership = user.memberships?.find(m => m.companyId === companyId);
        if (!membership) {
            this.logger.warn(`Permission check failed: No membership found for user ${user.id} in company ${companyId}`);
            throw new common_1.ForbiddenException('No membership found for this company.');
        }
        const userPermissions = membership.permissions || {};
        const hasPermissions = requiredPermissions.every(permission => userPermissions[permission] === true);
        if (!hasPermissions) {
            this.logger.warn(`Permission check failed: User lacks required permissions ${requiredPermissions.join(', ')}`);
        }
        return hasPermissions;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = PermissionsGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map