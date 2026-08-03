#!/usr/bin/env node
/**
 * Runs `prisma db push` during Vercel build when a database URL is available.
 */
import { spawnSync } from 'node:child_process';

const optional = (value) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const buildUrlFromPassword = () => {
  const password =
    optional(process.env.SUPABASE_DB_PASSWORD) ||
    optional(process.env.SUPABASE_DATABASE_PASSWORD) ||
    optional(process.env.DB_PASSWORD);
  if (!password) return undefined;

  const supabaseUrl =
    optional(process.env.SUPABASE_URL) ||
    optional(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    'https://hflapipozwwwinbbfpuh.supabase.co';

  let projectRef = 'hflapipozwwwinbbfpuh';
  try {
    projectRef = new URL(supabaseUrl).hostname.split('.')[0] || projectRef;
  } catch {
    // keep default
  }

  const encoded = encodeURIComponent(password);
  const poolerHost = optional(process.env.SUPABASE_POOLER_HOST);
  if (poolerHost) {
    return `postgresql://postgres.${projectRef}:${encoded}@${poolerHost}/postgres?sslmode=require`;
  }
  return `postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
};

let databaseUrl =
  optional(process.env.DATABASE_URL) ||
  optional(process.env.POSTGRES_URL) ||
  optional(process.env.POSTGRES_PRISMA_URL) ||
  buildUrlFromPassword();

if (databaseUrl && !/sslmode=/i.test(databaseUrl)) {
  databaseUrl += `${databaseUrl.includes('?') ? '&' : '?'}sslmode=require`;
}

if (!databaseUrl) {
  console.warn(
    '[vercel-db] No DATABASE_URL / SUPABASE_DB_PASSWORD — skipping prisma db push.',
  );
  process.exit(0);
}

if (/localhost|127\.0\.0\.1/.test(databaseUrl)) {
  console.warn('[vercel-db] DATABASE_URL points at localhost — skipping on Vercel.');
  process.exit(0);
}

process.env.DATABASE_URL = databaseUrl;
console.info('[vercel-db] Pushing Prisma schema…');
const result = spawnSync('npm', ['run', 'db:push', '-w', '@seo-vision/api'], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  console.warn('[vercel-db] prisma db push failed — continuing frontend build.');
}

process.exit(0);
