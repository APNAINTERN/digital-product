#!/usr/bin/env node
/**
 * Runs `prisma db push` during Vercel build when DATABASE_URL is set.
 * Skips (does not fail the build) when unset or unreachable so the
 * frontend can still deploy; API will return a clear DB error at runtime.
 */
import { spawnSync } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.warn(
    '[vercel-db] DATABASE_URL is not set — skipping prisma db push. Add your Supabase Postgres URI in Vercel env vars.',
  );
  process.exit(0);
}

if (/localhost|127\.0\.0\.1/.test(databaseUrl)) {
  console.warn(
    '[vercel-db] DATABASE_URL points at localhost — skipping prisma db push on Vercel.',
  );
  process.exit(0);
}

console.info('[vercel-db] Pushing Prisma schema to DATABASE_URL…');
const result = spawnSync(
  'npm',
  ['run', 'db:push', '-w', '@seo-vision/api'],
  { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' },
);

if (result.status !== 0) {
  console.warn(
    '[vercel-db] prisma db push failed — continuing frontend build. Fix DATABASE_URL (Supabase pooler URI with ?sslmode=require) and redeploy.',
  );
}

process.exit(0);
