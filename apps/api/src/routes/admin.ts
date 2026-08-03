import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

type Plan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
type Role = 'USER' | 'ADMIN';

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
});

const idParamsSchema = z.object({
  id: z.string().min(1),
});

const keyParamsSchema = z.object({
  key: z.string().min(1),
});

const reportQuerySchema = paginationSchema.extend({
  status: z.enum(['QUEUED', 'CRAWLING', 'ANALYZING', 'GENERATING', 'COMPLETED', 'FAILED']).optional(),
});

const messageQuerySchema = paginationSchema.extend({
  status: z.string().trim().optional(),
});

const usageQuerySchema = paginationSchema.extend({
  userId: z.string().trim().optional(),
  endpoint: z.string().trim().optional(),
  method: z.string().trim().optional(),
});

const patchUserSchema = z
  .object({
    role: z.enum(['USER', 'ADMIN']).optional(),
    plan: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']).optional(),
    emailVerified: z.boolean().optional(),
    apiCallsLimit: z.number().int().nonnegative().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

const patchMessageSchema = z
  .object({
    status: z.string().trim().min(1).max(50).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

const baseFeatureSchema = z
  .object({
    key: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    enabled: z.boolean().optional(),
  });

const patchFeatureSchema = baseFeatureSchema
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

const patchFeaturesSchema = z.object({
  features: z.array(baseFeatureSchema.extend({ key: z.string().trim().min(1) })).min(1),
});

const patchSettingSchema = z.object({
  key: z.string().trim().min(1).optional(),
  value: z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.unknown()), z.array(z.unknown())]),
});

const patchSettingsSchema = z.object({
  settings: z.array(patchSettingSchema.extend({ key: z.string().trim().min(1) })).min(1),
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

const serializeSettingValue = (value: unknown): string => (typeof value === 'string' ? value : JSON.stringify(value));

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  plan: true,
  emailVerified: true,
  apiCallsUsed: true,
  apiCallsLimit: true,
  theme: true,
  createdAt: true,
  updatedAt: true,
};

router.use(requireAuth, requireAdmin);

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [usersCount, reportsCount, usage, usersByPlan, reportsByStatus, openMessagesCount] = await Promise.all([
      prisma.user.count(),
      prisma.report.count(),
      prisma.apiUsage.aggregate({
        _count: { _all: true },
        _sum: { credits: true },
      }),
      prisma.user.groupBy({
        by: ['plan'],
        _count: { _all: true },
      }),
      prisma.report.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.contactMessage.count({ where: { status: 'open' } }),
    ]);

    res.json({
      usersCount,
      reportsCount,
      apiUsage: {
        requests: usage._count._all,
        credits: usage._sum.credits ?? 0,
      },
      plansBreakdown: usersByPlan.reduce<Record<string, number>>(
        (acc, item: { plan: string; _count: { _all: number } }) => {
        acc[item.plan] = item._count._all;
        return acc;
        },
        {},
      ),
      reportsByStatus: reportsByStatus.reduce<Record<string, number>>(
        (acc, item: { status: string; _count: { _all: number } }) => {
        acc[item.status] = item._count._all;
        return acc;
        },
        {},
      ),
      openMessagesCount,
    });
  }),
);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const query = paginationSchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;
    const where = query.search
      ? {
          OR: [
            { email: { contains: query.search } },
            { name: { contains: query.search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
        select: publicUserSelect,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  }),
);

router.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const input = patchUserSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.role ? { role: input.role as Role } : {}),
        ...(input.plan ? { plan: input.plan as Plan } : {}),
        ...(input.emailVerified !== undefined ? { emailVerified: input.emailVerified } : {}),
        ...(input.apiCallsLimit !== undefined ? { apiCallsLimit: input.apiCallsLimit } : {}),
      },
      select: publicUserSelect,
    });

    res.json({ user });
  }),
);

router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    if (id === req.user!.id) {
      throw new AppError('You cannot delete your own account', 400, 'CANNOT_DELETE_SELF');
    }

    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  }),
);

router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const query = reportQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { url: { contains: query.search } },
              { domain: { contains: query.search } },
              { summary: { contains: query.search } },
              { user: { email: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.report.count({ where }),
    ]);

    res.json({
      reports,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  }),
);

router.get(
  '/messages',
  asyncHandler(async (req, res) => {
    const query = messageQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { email: { contains: query.search } },
              { subject: { contains: query.search } },
              { message: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [messages, total] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.contactMessage.count({ where }),
    ]);

    res.json({
      messages,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  }),
);

router.patch(
  '/messages/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const input = patchMessageSchema.parse(req.body);
    const message = await prisma.contactMessage.update({
      where: { id },
      data: input,
    });

    res.json({ message });
  }),
);

router.get(
  '/features',
  asyncHandler(async (_req, res) => {
    const features = await prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });

    res.json({ features });
  }),
);

router.patch(
  '/features',
  asyncHandler(async (req, res) => {
    const input = patchFeaturesSchema.parse(req.body);
    const features = await prisma.$transaction(
      input.features.map((feature) =>
        prisma.featureFlag.upsert({
          where: { key: feature.key },
          update: {
            ...(feature.name ? { name: feature.name } : {}),
            ...(Object.prototype.hasOwnProperty.call(feature, 'description')
              ? { description: feature.description }
              : {}),
            ...(feature.enabled !== undefined ? { enabled: feature.enabled } : {}),
          },
          create: {
            key: feature.key,
            name: feature.name ?? feature.key,
            description: feature.description,
            enabled: feature.enabled ?? true,
          },
        }),
      ),
    );

    res.json({ features });
  }),
);

router.patch(
  '/features/:key',
  asyncHandler(async (req, res) => {
    const { key } = keyParamsSchema.parse(req.params);
    const input = patchFeatureSchema.parse(req.body);
    const feature = await prisma.featureFlag.upsert({
      where: { key },
      update: {
        ...(input.name ? { name: input.name } : {}),
        ...(Object.prototype.hasOwnProperty.call(input, 'description') ? { description: input.description } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      },
      create: {
        key,
        name: input.name ?? key,
        description: input.description,
        enabled: input.enabled ?? true,
      },
    });

    res.json({ feature });
  }),
);

router.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    res.json({ settings });
  }),
);

router.patch(
  '/settings',
  asyncHandler(async (req, res) => {
    const input = patchSettingsSchema.parse(req.body);
    const settings = await prisma.$transaction(
      input.settings.map((setting) =>
        prisma.systemSetting.upsert({
          where: { key: setting.key },
          update: { value: serializeSettingValue(setting.value) },
          create: {
            key: setting.key,
            value: serializeSettingValue(setting.value),
          },
        }),
      ),
    );

    res.json({ settings });
  }),
);

router.patch(
  '/settings/:key',
  asyncHandler(async (req, res) => {
    const { key } = keyParamsSchema.parse(req.params);
    const input = patchSettingSchema.parse(req.body);
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: serializeSettingValue(input.value) },
      create: {
        key,
        value: serializeSettingValue(input.value),
      },
    });

    res.json({ setting });
  }),
);

router.get(
  '/usage',
  asyncHandler(async (req, res) => {
    const query = usageQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;
    const where = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.endpoint ? { endpoint: { contains: query.endpoint } } : {}),
      ...(query.method ? { method: query.method.toUpperCase() } : {}),
      ...(query.search
        ? {
            OR: [
              { endpoint: { contains: query.search } },
              { method: { contains: query.search } },
              { user: { email: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [usage, total, credits] = await Promise.all([
      prisma.apiUsage.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
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
      usage: usage.map((entry: { meta: string | null }) => ({
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
