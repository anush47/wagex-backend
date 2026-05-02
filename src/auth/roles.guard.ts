import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    // Assuming user object is attached to request by JwtAuthGuard -> BetterAuthStrategy
    // And user object has a 'role' property.
    if (!user || !user.role) {
      return false;
    }

    // Admins always pass roles checks
    if (user.role === Role.ADMIN) return true;

    return requiredRoles.includes(user.role as Role);
  }
}
