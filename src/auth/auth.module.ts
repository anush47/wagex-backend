import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SupabaseStrategy } from './supabase.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserExistsGuard } from './user-exists.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    PassportModule,
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SupabaseStrategy,
    JwtAuthGuard,
    RolesGuard,
    UserExistsGuard
  ],
  exports: [AuthService, SupabaseStrategy, JwtAuthGuard, RolesGuard],
})
export class AuthModule { }
