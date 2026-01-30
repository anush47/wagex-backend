import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_USER_CHECK_KEY } from './skip-user-check.decorator';

@Injectable()
export class UserExistsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const skip = this.reflector.getAllAndOverride<boolean>(SKIP_USER_CHECK_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (skip) return true;

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Block if user is guest (not in DB)
        if (user?.isGuest) {
            throw new ForbiddenException('User registration required');
        }

        return true;
    }
}
