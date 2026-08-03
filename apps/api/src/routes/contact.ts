import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = contactSchema.parse(req.body);
    const message = await prisma.contactMessage.create({
      data: input,
    });

    res.status(201).json({
      message: 'Message received. We will get back to you soon.',
      id: message.id,
    });
  }),
);

export default router;
