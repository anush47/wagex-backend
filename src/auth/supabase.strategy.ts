import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        const supabaseUrl = configService.get<string>('SUPABASE_URL');
        if (!supabaseUrl) throw new Error('SUPABASE_URL not defined');

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
            }),
            algorithms: ['ES256', 'RS256', 'HS256'],
        });
    }

    async validate(payload: any) {
        if (!payload || !payload.email) {
            throw new UnauthorizedException('Invalid Token');
        }

        const { email, sub: supabaseUid } = payload;

        // Check local DB
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                memberships: {
                    include: { company: true }
                }
            },
        });

        if (user) {
            if (!user.active) throw new UnauthorizedException('User inactive');
            return user; // Return full user entity
        }

        // User not found in DB -> Return "Guest" context for Registration
        return {
            isGuest: true,
            email,
            supabaseUid,
            roles: [] // Guest has no roles yet
        };
    }
}
