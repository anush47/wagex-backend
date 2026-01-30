import { Controller, Get, Query, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { SkipUserCheck } from './skip-user-check.decorator';

@ApiTags('Dev Tools')
@Controller('dev/auth')
export class DevAuthController {
    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    @Get('token')
    @SkipUserCheck() // No auth needed to get the token (obviously)
    @ApiOperation({ summary: 'Get Dev Token (DEV ENV ONLY)' })
    @ApiQuery({ name: 'email', required: true })
    async getDevToken(@Query('email') email: string) {
        const env = this.configService.get<string>('ENVIRONMENT');
        if (env !== 'dev') {
            throw new NotFoundException('Endpoint not available');
        }

        const user = await this.prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            throw new NotFoundException('User not found. Register them first or manually insert into DB?');
        }

        // Sign payload mimicking Supabase structure
        const payload = {
            email: user.email,
            sub: user.id, // Important: Match Supabase UID if possible
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: { provider: 'email' },
            user_metadata: {},
        };

        const token = this.jwtService.sign(payload);

        return {
            accessToken: token,
            user
        };
    }
}
