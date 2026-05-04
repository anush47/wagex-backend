import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

// Single shared pool for the entire application to respect EMAXCONNSESSION limits
// We cap it at 10 to leave room for other tools (Prisma Studio, etc.)
export const sharedPool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

sharedPool.on('error', (err) => {
  console.error('[SHARED POOL ERROR]', err);
});
