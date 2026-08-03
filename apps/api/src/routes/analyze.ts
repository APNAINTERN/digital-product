import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { runFullAnalysis } from '../services/analysisPipeline.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

type PipelineProgress = {
  status?: 'QUEUED' | 'CRAWLING' | 'ANALYZING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  message?: string;
};

type AnalysisResult = {
  seoScore?: number;
  performanceScore?: number;
  healthScore?: number;
  summary?: string;
  seo?: {
    scores?: {
      overall?: number;
      technical?: number;
      security?: number;
    };
    coreWebVitals?: {
      performanceScore?: number;
    };
  };
  ai?: {
    executiveSummary?: string;
  };
  scores?: {
    seo?: number;
    seoScore?: number;
    performance?: number;
    performanceScore?: number;
    health?: number;
    healthScore?: number;
  };
  [key: string]: unknown;
};

type RunFullAnalysis = (
  url: string,
  onProgress?: (progress: number, message: string) => Promise<void> | void,
) => Promise<AnalysisResult>;

const analyzeSchema = z.object({
  url: z.string().trim().url(),
});

const statusParamsSchema = z.object({
  id: z.string().min(1),
});

const normalizeUrl = (url: string): URL => {
  try {
    return new URL(url);
  } catch {
    throw new AppError('A valid URL is required', 400, 'INVALID_URL');
  }
};

const scoreFromResult = (result: AnalysisResult, directKey: keyof AnalysisResult, scoreKey: string): number | undefined => {
  const directValue = result[directKey];
  if (typeof directValue === 'number') {
    return Math.round(directValue);
  }

  const scores = result.scores as Record<string, unknown> | undefined;
  const scoreValue = scores?.[scoreKey] ?? scores?.[`${scoreKey}Score`];
  if (typeof scoreValue === 'number') {
    return Math.round(scoreValue);
  }

  if (scoreKey === 'seo' && typeof result.seo?.scores?.overall === 'number') {
    return Math.round(result.seo.scores.overall);
  }

  if (scoreKey === 'performance' && typeof result.seo?.coreWebVitals?.performanceScore === 'number') {
    return Math.round(result.seo.coreWebVitals.performanceScore);
  }

  if (
    scoreKey === 'health' &&
    typeof result.seo?.scores?.technical === 'number' &&
    typeof result.seo.scores.security === 'number'
  ) {
    return Math.round((result.seo.scores.technical + result.seo.scores.security) / 2);
  }

  return undefined;
};

const runAnalysisInBackground = (reportId: string, userId: string, url: string): void => {
  void (async () => {
    try {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'CRAWLING',
          progress: 5,
          statusMessage: 'Starting crawl',
        },
      });

      const result = await (runFullAnalysis as unknown as RunFullAnalysis)(url, async (progress, message) => {
          await prisma.report.update({
            where: { id: reportId },
            data: {
              status: progress < 30 ? 'CRAWLING' : progress < 78 ? 'ANALYZING' : 'GENERATING',
              progress: Math.max(0, Math.min(100, Math.round(progress))),
              statusMessage: message,
            },
          });
        });

      const seoScore = scoreFromResult(result, 'seoScore', 'seo');
      const performanceScore = scoreFromResult(result, 'performanceScore', 'performance');
      const healthScore = scoreFromResult(result, 'healthScore', 'health');
      const summary =
        typeof result.summary === 'string'
          ? result.summary
          : typeof result.ai?.executiveSummary === 'string'
            ? result.ai.executiveSummary
            : undefined;

      await prisma.$transaction([
        prisma.report.update({
          where: { id: reportId },
          data: {
            status: 'COMPLETED',
            progress: 100,
            statusMessage: 'Analysis complete',
            errorMessage: null,
            seoScore,
            performanceScore,
            healthScore,
            summary,
            data: JSON.stringify(result),
            completedAt: new Date(),
          },
        }),
        prisma.notification.create({
          data: {
            userId,
            title: 'Analysis complete',
            message: `Your SEO report for ${url} is ready.`,
            type: 'success',
            link: `/reports/${reportId}`,
          },
        }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed';
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'FAILED',
          progress: 100,
          statusMessage: 'Analysis failed',
          errorMessage: message,
        },
      });

      await prisma.notification.create({
        data: {
          userId,
          title: 'Analysis failed',
          message: `We could not complete the SEO report for ${url}.`,
          type: 'error',
          link: `/reports/${reportId}`,
        },
      });
    }
  })();
};

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = analyzeSchema.parse(req.body);
    const parsedUrl = normalizeUrl(input.url);
    const url = parsedUrl.toString();
    const domain = parsedUrl.hostname.replace(/^www\./i, '');

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }

    if (user.apiCallsUsed >= user.apiCallsLimit) {
      throw new AppError('API call limit reached for your plan', 402, 'PLAN_LIMIT_REACHED', {
        used: user.apiCallsUsed,
        limit: user.apiCallsLimit,
        plan: user.plan,
      });
    }

    const report = await prisma.$transaction(async (tx) => {
      const createdReport = await tx.report.create({
        data: {
          userId: user.id,
          url,
          domain,
          status: 'QUEUED',
          progress: 0,
          statusMessage: 'Queued for analysis',
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { apiCallsUsed: { increment: 1 } },
      });

      await tx.apiUsage.create({
        data: {
          userId: user.id,
          endpoint: '/api/analyze',
          method: 'POST',
          status: 202,
          credits: 1,
          meta: JSON.stringify({ reportId: createdReport.id, url }),
        },
      });

      return createdReport;
    });

    runAnalysisInBackground(report.id, user.id, url);

    res.status(202).json({
      reportId: report.id,
      status: report.status,
      progress: report.progress,
      statusMessage: report.statusMessage,
    });
  }),
);

router.get(
  '/:id/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = statusParamsSchema.parse(req.params);
    const report = await prisma.report.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
      select: {
        id: true,
        status: true,
        progress: true,
        statusMessage: true,
        errorMessage: true,
        seoScore: true,
        performanceScore: true,
        healthScore: true,
        completedAt: true,
        updatedAt: true,
      },
    });

    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    res.json({ report });
  }),
);

export default router;
