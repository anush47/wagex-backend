import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('SUPABASE_JWT_SECRET'),
        });
    }

    async validate(payload: any) {
        if (!payload || !payload.email) {
            throw new UnauthorizedException('Invalid Token');
        }

        const { email } = payload;
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // For now, strict access control. 
            // In a real flow, we might handle registration here for Google Logins.
            throw new UnauthorizedException('User not registered in SalaryApp');
        }

        if (!user.active) {
            throw new UnauthorizedException('User account is inactive');
        }

        return user;
    }
}
