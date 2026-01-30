import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { Role } from '@prisma/client';
import { Permission } from './permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) return false;

        // Admins bypass all permission checks
        if (user.role === Role.ADMIN) return true;

        // We need a companyId context to check permissions
        // This could be in query (companyId), params (companyId), or body
        const companyId = request.query.companyId || request.params.companyId || request.body.companyId;

        if (!companyId && user.role === Role.EMPLOYER) {
            // If no companyId, but they are an employer, we might allow it 
            // if the endpoint handles it (e.g. list all my companies).
            // But for specific permissions, we usually need a context.
            return true;
        }

        const membership = user.memberships?.find(m => m.companyId === companyId);
        if (!membership) {
            throw new ForbiddenException('No membership found for this company.');
        }

        const userPermissions = membership.permissions || {};

        // Check if user has all required permissions for this specific company
        // This assumes permissions are a simple object { can_view: true }
        return requiredPermissions.every(permission => userPermissions[permission] === true);
    }
}
