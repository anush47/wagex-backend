import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevJwtStrategy extends PassportStrategy(Strategy, 'jwt-dev') {
    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        const secret = configService.get<string>('DEV_JWT_SECRET');
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret || 'dev-secret-fallback',
        });
    }

    async validate(payload: any) {
        // Only allow this strategy if ENVIRONMENT is 'dev'
        const env = this.configService.get<string>('ENVIRONMENT');
        if (env !== 'dev') {
            throw new UnauthorizedException('Dev Strategy disabled in non-dev environment');
        }

        if (!payload || !payload.email) {
            throw new UnauthorizedException('Invalid Dev Token');
        }

        const { email } = payload;
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Allow "Guest" for dev registration flow too
            return {
                isGuest: true,
                email,
                sub: payload.sub,
                roles: []
            };
        }

        // Warn: Dev tokens are super powerful, maybe check user.active?
        if (!user.active) {
            throw new UnauthorizedException('User inactive');
        }

        return user;
    }
}
