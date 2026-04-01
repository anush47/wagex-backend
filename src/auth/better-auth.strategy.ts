import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { PrismaService } from '../prisma/prisma.service';
import { auth } from './better-auth';

import * as express from 'express';

@Injectable()
export class BetterAuthStrategy extends PassportStrategy(Strategy, 'better-auth') {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async validate(req: express.Request) {
    const session = (await auth.api.getSession({
      headers: req.headers as any,
    })) as { user: { id: string; email: string } } | null;

    if (!session || !session.user) {
      throw new UnauthorizedException('Invalid Session');
    }

    // Fetch user from local DB with optimized select
    const user = await this.prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          select: {
            id: true,
            companyId: true,
            role: true,
            active: true,
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      // This case might happen if Better Auth has the user but our User table doesn't (though they share the same DB)
      // For registration flow, we can return a guest context if needed,
      // but Better Auth usually ensures the user exists in the User table.
      return {
        isGuest: true,
        email: session.user.email,
        id: session.user.id,
        roles: [],
      };
    }

    return user;
  }
}
