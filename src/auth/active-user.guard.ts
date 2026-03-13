import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_INACTIVE_KEY } from './allow-inactive.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class ActiveUserGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // 1. Check if route is public
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        // 2. Check if route allows inactive users
        const allowInactive = this.reflector.getAllAndOverride<boolean>(ALLOW_INACTIVE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (allowInactive) return true;

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // 3. If user is in DB but inactive, block them
        if (user && !user.isGuest && user.active === false) {
            throw new UnauthorizedException('User inactive');
        }

        return true;
    }
}
