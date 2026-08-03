import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

type Plan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

const planLimits: Record<Plan, number> = {
  FREE: 10,
  STARTER: 50,
  PRO: 200,
  ENTERPRISE: 2000,
};

const upgradeSchema = z.object({
  plan: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']),
});

const parseFeatures = (features: string): unknown => {
  try {
    return JSON.parse(features);
  } catch {
    return features;
  }
};

router.get(
  '/plans',
  asyncHandler(async (_req, res) => {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { priceMonthly: 'asc' },
    });

    res.json({
      plans: plans.map((plan) => ({
        ...plan,
        features: parseFeatures(plan.features),
      })),
    });
  }),
);

router.post(
  '/upgrade',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = upgradeSchema.parse(req.body);
    const selectedPlan = input.plan;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        plan: selectedPlan,
        apiCallsLimit: planLimits[selectedPlan],
      },
    });

    res.json({
      message: `Plan updated to ${selectedPlan}`,
      user: {
        id: user.id,
        plan: user.plan,
        apiCallsUsed: user.apiCallsUsed,
        apiCallsLimit: user.apiCallsLimit,
      },
    });
  }),
);

export default router;
