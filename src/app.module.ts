import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { EmployeesModule } from './employees/employees.module';
import { UserExistsGuard } from './auth/user-exists.guard';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { RolesGuard } from './auth/roles.guard';
import { PermissionsGuard } from './auth/permissions.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100, // 100 requests per minute
    }]),
    PrismaModule,
    UsersModule,
    AuthModule,
    CompaniesModule,
    EmployeesModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Rate Limiting
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Global Authentication
    },
    {
      provide: APP_GUARD,
      useClass: UserExistsGuard, // Auth Logic
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Role-based Access Control
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard, // Granular Permissions
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor, // Audit Logging
    }
  ],
})
export class AppModule { }
