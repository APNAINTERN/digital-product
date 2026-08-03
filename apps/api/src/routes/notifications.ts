import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  unread: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

const idParamsSchema = z.object({
  id: z.string().min(1),
});

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;
    const where = {
      userId: req.user!.id,
      ...(query.unread !== undefined ? { read: query.unread ? false : true } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId: req.user!.id,
          read: false,
        },
      }),
    ]);

    res.json({
      notifications,
      unreadCount,
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
  '/:id/read',
  asyncHandler(async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json({ notification: updatedNotification });
  }),
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.user!.id,
        read: false,
      },
      data: { read: true },
    });

    res.json({ updated: result.count });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
      select: { id: true },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
    }

    await prisma.notification.delete({ where: { id } });
    res.status(204).send();
  }),
);

export default router;
