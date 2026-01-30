import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SupabaseStrategy } from './supabase.strategy';
import { DevJwtStrategy } from './dev-jwt.strategy';
import { DevAuthController } from './dev-auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserExistsGuard } from './user-exists.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('DEV_JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController, DevAuthController],
  providers: [
    AuthService,
    SupabaseStrategy,
    DevJwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    UserExistsGuard
  ],
  exports: [AuthService, SupabaseStrategy, JwtAuthGuard, RolesGuard],
})
export class AuthModule { }
