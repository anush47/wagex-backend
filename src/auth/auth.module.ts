import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SupabaseStrategy } from './supabase.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseStrategy, JwtAuthGuard, RolesGuard],
  exports: [AuthService, SupabaseStrategy, JwtAuthGuard, RolesGuard],
})
export class AuthModule { }
