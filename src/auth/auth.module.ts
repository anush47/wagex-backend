import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { BetterAuthStrategy } from './better-auth.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserExistsGuard } from './user-exists.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [PassportModule, ConfigModule],
  controllers: [AuthController],
  providers: [AuthService, BetterAuthStrategy, JwtAuthGuard, RolesGuard, UserExistsGuard],
  exports: [AuthService, BetterAuthStrategy, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
