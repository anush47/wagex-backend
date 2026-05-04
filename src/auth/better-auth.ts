import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';
import { bearer } from 'better-auth/plugins/bearer';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { createAuthMiddleware, APIError } from 'better-auth/api';

import { sharedPool } from '../common/database/connection-pool';

const adapter = new PrismaPg(sharedPool);
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  baseURL: `${process.env.BETTER_AUTH_URL}/v1/auth`,
  trustedOrigins: (
    process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
      : ['http://localhost:3000']
  ),
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

});
