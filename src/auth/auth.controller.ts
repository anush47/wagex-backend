import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Change password' })
    @ApiResponse({ status: 200, description: 'Password change handled by Supabase or internal.' })
    changePassword(@Body() body: any) {
        // In Supabase auth, usually client handles password change via SDK.
        // If backend proxy is needed, use Supabase Admin API.
        return { message: 'Use Supabase Client SDK for password change or implement Admin API proxy here.' };
    }
}
