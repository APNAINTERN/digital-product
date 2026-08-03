import type { VercelRequest, VercelResponse } from '@vercel/node';

let appPromise: Promise<((req: unknown, res: unknown) => unknown) | null> | null = null;
let seedPromise: Promise<void> | null = null;

async function loadApp() {
  if (!appPromise) {
    appPromise = import('../apps/api/dist/app.js')
      .then((mod) => (mod.default ?? mod) as (req: unknown, res: unknown) => unknown)
      .catch((error) => {
        console.error('Failed to load Express app', error);
        appPromise = null;
        throw error;
      });
  }
  return appPromise;
}

async function prepareDatabase() {
  if (!seedPromise) {
    seedPromise = import('../apps/api/dist/lib/seedOnBoot.js')
      .then(async (mod) => {
        if (typeof mod.ensureSeedData === 'function') {
          await mod.ensureSeedData();
        }
      })
      .catch((error) => {
        console.error('Seed bootstrap failed', error);
        seedPromise = null;
        throw error;
      });
  }
  await seedPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await loadApp();
    try {
      await prepareDatabase();
    } catch {
      res.status(500).json({
        error: {
          message:
            'Database is not ready. Set DATABASE_URL to your Supabase Postgres URI (Project Settings → Database → URI, add ?sslmode=require).',
          code: 'DB_NOT_READY',
        },
      });
      return;
    }
    return app(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: {
        message: 'API failed to start. Check Vercel build logs and ensure npm run vercel-build completed.',
        code: 'API_BOOT_FAILED',
      },
    });
  }
}
