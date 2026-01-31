import { Controller, Get, Request, UseGuards, Put, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @ApiOperation({ summary: 'Get profile of the authenticated user' })
    @ApiResponse({ status: 200, description: 'Return current user profile.' })
    getProfile(@Request() req) {
        return req.user;
    }

    @Put()
    @ApiOperation({ summary: 'Update profile of the authenticated user' })
    @ApiResponse({ status: 200, description: 'Profile updated.' })
    updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
        // Strip sensitive fields that users shouldn't be able to self-update
        const { active, ...safeFields } = updateUserDto;

        return this.usersService.update(req.user.id, safeFields);
    }
}
