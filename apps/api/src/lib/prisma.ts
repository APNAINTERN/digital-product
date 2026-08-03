import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';

import { config, resolveDatabaseUrl } from '../config.js';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: pg.Pool;
};

const connectionString =
  config.databaseUrl ??
  resolveDatabaseUrl() ??
  process.env.DATABASE_URL ??
  'postgresql://seovision:seovision@localhost:5432/seovision?schema=public';

const needsSsl =
  /sslmode=require/i.test(connectionString) ||
  /supabase\.co|neon\.tech|pooler/i.test(connectionString) ||
  Boolean(process.env.VERCEL);

const pool =
  globalForPrisma.pgPool ??
  new pg.Pool({
    connectionString,
    max: process.env.VERCEL ? 1 : 10,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL) {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}

export default prisma;
