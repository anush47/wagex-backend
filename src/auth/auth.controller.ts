import { Controller, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { SkipUserCheck } from './skip-user-check.decorator';
import { UserExistsGuard } from './user-exists.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('change-password')
    @UseGuards(JwtAuthGuard, UserExistsGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Change password' })
    @ApiResponse({ status: 200, description: 'Password change handled by Supabase or internal.' })
    changePassword(@Body() body: any) {
        return { message: 'Use Supabase Client SDK for password change.' };
    }

    @Post('register')
    @UseGuards(JwtAuthGuard, UserExistsGuard)
    @SkipUserCheck()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Register User from Supabase Token' })
    @ApiResponse({ status: 201, description: 'User profile created in database.' })
    async register(@Request() req, @Body() dto: RegisterDto) {
        const { email, sub: id, isGuest } = req.user;

        if (!isGuest) {
            throw new BadRequestException('User already registered.');
        }

        // Delegate business logic to Service
        return this.authService.registerUser(id, email, dto);
    }
}
