import type { VercelRequest, VercelResponse } from '@vercel/node';

type ExpressApp = (req: unknown, res: unknown) => unknown;

let appPromise: Promise<ExpressApp> | null = null;
let seedPromise: Promise<void> | null = null;

async function loadApp(): Promise<ExpressApp> {
  if (!appPromise) {
    appPromise = import('../apps/api/dist/app.js')
      .then((mod) => (mod.default ?? mod) as ExpressApp)
      .catch((error) => {
        console.error('Failed to load Express app', error);
        appPromise = null;
        throw error;
      });
  }
  return appPromise;
}

async function prepareDatabase(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    if (!seedPromise) {
      seedPromise = import('../apps/api/dist/lib/seedOnBoot.js')
        .then(async (mod) => {
          if (typeof mod.ensureSeedData === 'function') {
            await mod.ensureSeedData();
          }
        })
        .catch((error) => {
          seedPromise = null;
          throw error;
        });
    }
    await seedPromise;
    return { ok: true };
  } catch (error) {
    console.error('Database bootstrap failed', error);
    return {
      ok: false,
      message:
        'Database is not ready. In Vercel → Environment Variables add SUPABASE_DB_PASSWORD (Supabase database password) OR DATABASE_URL (full Postgres URI), then Redeploy.',
    };
  }
}

/**
 * Single entry for all /api/* traffic (via vercel.json rewrite).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await loadApp();
    const db = await prepareDatabase();

    const url = typeof req.url === 'string' ? req.url : '';
    if (!db.ok && !url.includes('/api/health') && url !== '/health') {
      res.status(503).json({
        error: {
          message: db.message,
          code: 'DB_NOT_READY',
          help: {
            easiest:
              'Vercel → Settings → Environment Variables → Add SUPABASE_DB_PASSWORD = your Supabase Database password, then Redeploy',
            alternative:
              'Or set DATABASE_URL to the full URI from Supabase → Project Settings → Database → Connect → URI (?sslmode=require)',
          },
        },
      });
      return;
    }

    if (url.includes('/api/health') || url === '/health') {
      res.status(200).json({
        status: db.ok ? 'ok' : 'degraded',
        service: 'seo-vision-api',
        database: db.ok ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
        ...(db.ok
          ? {}
          : {
              message: db.message,
              help: {
                easiest: 'Add Vercel env SUPABASE_DB_PASSWORD = Supabase database password, then Redeploy',
                alternative: 'Or set DATABASE_URL = Supabase Database Connect URI with ?sslmode=require',
              },
            }),
      });
      return;
    }

    return app(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: {
        message:
          'API failed to start. Check Vercel build logs and ensure npm run vercel-build completed.',
        code: 'API_BOOT_FAILED',
      },
    });
  }
}
