import type { VercelRequest, VercelResponse } from '@vercel/node';

// Built by `npm run vercel-build` before this function is bundled.
import app from '../apps/api/dist/app.js';
import { ensureSeedData } from '../apps/api/dist/lib/seedOnBoot.js';

let boot: Promise<void> | undefined;

async function prepare() {
  if (!boot) {
    boot = ensureSeedData().catch((error: unknown) => {
      console.error('Seed bootstrap failed', error);
      boot = undefined;
      throw error;
    });
  }
  await boot;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await prepare();
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: {
        message:
          'Database is not ready. Set DATABASE_URL to a Postgres connection string (e.g. Neon) in Vercel env vars.',
        code: 'DB_NOT_READY',
      },
    });
    return;
  }

  return app(req as never, res as never);
}
