import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';
import { bearer } from 'better-auth/plugins/bearer';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { createAuthMiddleware, APIError } from 'better-auth/api';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  baseURL: `${process.env.BETTER_AUTH_URL}/api/v1/auth`,
  trustedOrigins: [
    'http://localhost:3000',
    // Add production frontend URL here later
  ],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 6,
  },
  plugins: [bearer()],
  user: {
    additionalFields: {
      nameWithInitials: {
        type: 'string',
        required: false,
      },
      fullName: {
        type: 'string',
        required: false,
      },
      address: {
        type: 'string',
        required: false,
      },
      phone: {
        type: 'string',
        required: false,
      },
      role: {
        type: 'string',
        required: false,
        defaultValue: 'EMPLOYER',
      },
      active: {
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!ctx.path.startsWith('/sign-in')) return;

      const email = ctx.body?.email;
      if (!email) return;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return;

      // Block anyone whose active flag is false:
      // - Employers: active=false until an admin approves their account (shows a pending screen)
      // - Employees: active=false when employer disables their Portal Access toggle
      if (!user.active) {
        throw new APIError('FORBIDDEN', {
          message: 'Your account is not yet active. Please contact your administrator.',
        });
      }
    }),
  },
});
