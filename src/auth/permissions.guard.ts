import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { Role } from '@prisma/client';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) return false;

    // Admins bypass all permission checks
    if (user.role === Role.ADMIN) return true;

    // We need a companyId context to check permissions for employers
    const query = (request.query || {}) as Record<string, string>;
    const params = (request.params || {}) as Record<string, string>;
    const body = (request.body || {}) as Record<string, any>;
    
    // Primary sources for companyId
    let companyId = query.companyId || params.companyId || (body.companyId as string);

    // Fallback to params.id ONLY if the controller is specifically CompaniesController
    // This prevents :id from other resources (like policies) being mistaken for a companyId
    if (!companyId && params.id) {
      const className = context.getClass().name;
      if (className === 'CompaniesController') {
        companyId = params.id;
      }
    }

    // If no companyId, we only allow GET requests (which will be filtered by the service/controller)
    if (!companyId) {
      if (request.method === 'GET') {
        // GET requests handling tenancy in service/controller
        return true;
      }
      this.logger.warn(
        `Permission check failed: companyId is required for ${user.role} on ${request.method} ${request.url}`,
      );
      throw new ForbiddenException('companyId is required for permission-protected operations.');
    }

    // Fetch ONLY the specific membership for this user and company
    const membershipStart = Date.now();
    
    // 1. Use pre-fetched memberships from Auth Strategy (Saved DB Roundtrip)
    const membership = user.memberships?.find((m) => m.companyId === companyId);
    
    if (!membership) {
      this.logger.warn(`Permission check failed: No membership found for user ${user.id} in company ${companyId}`);
      throw new ForbiddenException('No membership found for this company.');
    }

    if (membership.active === false) {
      throw new ForbiddenException('Your access to this company has been suspended.');
    }

    const userPermissions = (membership.permissions as Record<string, boolean>) || {};

    // Check if user has all required permissions for this specific company
    const hasPermissions = requiredPermissions.every((permission) => userPermissions[permission] === true);

    if (!hasPermissions) {
      this.logger.warn(`Permission check failed: User lacks required permissions ${requiredPermissions.join(', ')}`);
    }

    return hasPermissions;
  }
}
