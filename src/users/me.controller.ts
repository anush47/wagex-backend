import { Controller, Get, Request, Put, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';

import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { AllowInactive } from '../auth/allow-inactive.decorator';
import * as RequestWithUserNamespace from '../common/interfaces/request-with-user.interface';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @AllowInactive()
  @ApiOperation({ summary: 'Get profile of the authenticated user' })
  @ApiResponse({ status: 200, description: 'Return current user profile.' })
  getProfile(@Request() req: RequestWithUserNamespace.RequestWithUser) {
    return req.user;
  }

  @Put()
  @ApiOperation({ summary: 'Update profile of the authenticated user' })
  @ApiResponse({ status: 200, description: 'Profile updated.' })
  updateProfile(@Request() req: RequestWithUserNamespace.RequestWithUser, @Body() updateUserDto: UpdateUserDto) {
    // Strip sensitive fields that users shouldn't be able to self-update
    const { active: _, ...safeFields } = updateUserDto;

    return this.usersService.update(req.user.id, safeFields);
  }
}
