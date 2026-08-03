import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const parseMeta = (meta: string | null): unknown => {
  if (!meta) {
    return null;
  }

  try {
    return JSON.parse(meta);
  } catch {
    return meta;
  }
};

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;
    const where = { userId: req.user!.id };
    const [usage, total, credits] = await Promise.all([
      prisma.apiUsage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.apiUsage.count({ where }),
      prisma.apiUsage.aggregate({
        where,
        _sum: { credits: true },
      }),
    ]);

    res.json({
      usage: usage.map((entry) => ({
        ...entry,
        meta: parseMeta(entry.meta),
      })),
      totalCredits: credits._sum.credits ?? 0,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  }),
);

export default router;
