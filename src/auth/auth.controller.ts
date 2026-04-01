import {
  Controller,
  Post,
  Body,
  Request as NestRequest,
  BadRequestException,
  Logger,
  All,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import * as express from 'express';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { SkipUserCheck } from './skip-user-check.decorator';
import { AllowInactive } from './allow-inactive.decorator';
import { auth } from './better-auth';
import { toNodeHandler } from 'better-auth/node';
import { Public } from './public.decorator';
import * as RequestWithUserNamespace from '../common/interfaces/request-with-user.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register-profile')
  @SkipUserCheck()
  @AllowInactive()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update User Profile' })
  @ApiResponse({ status: 201, description: 'User profile updated in database.' })
  async register(@NestRequest() req: RequestWithUserNamespace.RequestWithUser, @Body() dto: RegisterDto) {
    const user = req.user;
    if (!user || !user.id) {
      throw new BadRequestException('Invalid session');
    }

    // Delegate business logic to Service
    return this.authService.registerUser(user.id, user.email, dto);
  }

  @Public()
  @All('*path')
  async handleBetterAuth(@Req() req: express.Request, @Res() res: express.Response) {
    return toNodeHandler(auth.handler)(req, res);
  }
}
