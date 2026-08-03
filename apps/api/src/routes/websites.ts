import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

const websiteBodySchema = z.object({
  url: z.string().trim().url(),
  label: z.string().trim().max(100).nullable().optional(),
});

const updateWebsiteSchema = websiteBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required',
});

const idParamsSchema = z.object({
  id: z.string().min(1),
});

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
});

const parseWebsiteUrl = (url: string): { url: string; domain: string } => {
  const parsedUrl = new URL(url);
  return {
    url: parsedUrl.toString(),
    domain: parsedUrl.hostname.replace(/^www\./i, ''),
  };
};

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const websites = await prisma.savedWebsite.findMany({
      where: {
        userId: req.user!.id,
        ...(query.search
          ? {
              OR: [
                { url: { contains: query.search } },
                { domain: { contains: query.search } },
                { label: { contains: query.search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ websites });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = websiteBodySchema.parse(req.body);
    const parsed = parseWebsiteUrl(input.url);
    const website = await prisma.savedWebsite.create({
      data: {
        userId: req.user!.id,
        url: parsed.url,
        domain: parsed.domain,
        label: input.label,
      },
    });

    res.status(201).json({ website });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const website = await prisma.savedWebsite.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    if (!website) {
      throw new AppError('Website not found', 404, 'WEBSITE_NOT_FOUND');
    }

    res.json({ website });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const input = updateWebsiteSchema.parse(req.body);
    const existingWebsite = await prisma.savedWebsite.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    if (!existingWebsite) {
      throw new AppError('Website not found', 404, 'WEBSITE_NOT_FOUND');
    }

    const parsed = input.url ? parseWebsiteUrl(input.url) : undefined;
    const website = await prisma.savedWebsite.update({
      where: { id },
      data: {
        ...(parsed ? { url: parsed.url, domain: parsed.domain } : {}),
        ...(Object.prototype.hasOwnProperty.call(input, 'label') ? { label: input.label } : {}),
      },
    });

    res.json({ website });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const website = await prisma.savedWebsite.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
      select: { id: true },
    });

    if (!website) {
      throw new AppError('Website not found', 404, 'WEBSITE_NOT_FOUND');
    }

    await prisma.savedWebsite.delete({ where: { id } });
    res.status(204).send();
  }),
);

export default router;
