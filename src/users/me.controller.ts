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
        // Prevent updating role/companyId via self-update if necessary
        // for MVP trusting the DTO for now, but usually strip sensitive fields
        return this.usersService.update(req.user.id, updateUserDto);
    }
}
