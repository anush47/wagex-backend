import { Controller, Post, Body, UseGuards, Request, BadRequestException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { validate as isUuid } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { SkipUserCheck } from './skip-user-check.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) { }

    @Post('change-password')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Change password' })
    @ApiResponse({ status: 200, description: 'Password change handled by Supabase or internal.' })
    changePassword(@Body() body: any) {
        return { message: 'Use Supabase Client SDK for password change.' };
    }

    @Post('register')
    @SkipUserCheck()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Register User from Supabase Token' })
    @ApiResponse({ status: 201, description: 'User profile created in database.' })
    async register(@Request() req, @Body() dto: RegisterDto) {
        const { email, sub: id, isGuest } = req.user;

        // Validate Supabase UID
        if (!id || !isUuid(id)) {
            this.logger.error(`UUID validation failed. id: ${id}, type: ${typeof id}`);
            throw new BadRequestException('Invalid Supabase UID');
        }

        if (!isGuest) {
            throw new BadRequestException('User already registered.');
        }

        // Delegate business logic to Service
        return this.authService.registerUser(id, email, dto);
    }
}
