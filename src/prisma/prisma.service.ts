import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    const connectionString = configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    const pool = new Pool({
      connectionString,
      max: 8, // Reduced to 8 to stay safely below Supabase's session limit (usually 15)
      min: 2, // Reduced min to free up connections during low traffic
      idleTimeoutMillis: 10000, // Faster idle release (10s)
      connectionTimeoutMillis: 5000, // Fail faster if we can't get a connection
      allowExitOnIdle: false,
    });

    // Add error handling
    pool.on('error', (err) => {
      console.error('[POOL ERROR]', err);
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
