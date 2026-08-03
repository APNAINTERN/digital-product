import type { Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import * as reportExport from '../services/reportExport.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

type ExportFormat = 'pdf' | 'excel' | 'json';
type ExportableReport = Record<string, unknown>;
type ExportResult =
  | Buffer
  | string
  | {
      buffer?: Buffer;
      content?: Buffer | string;
      data?: Buffer | string;
      mimeType?: string;
      filename?: string;
      fileName?: string;
    };

type ReportExportModule = {
  exportReport?: (report: ExportableReport, format: ExportFormat) => Promise<ExportResult> | ExportResult;
  exportReportToPdf?: (report: ExportableReport) => Promise<ExportResult> | ExportResult;
  exportReportToExcel?: (report: ExportableReport) => Promise<ExportResult> | ExportResult;
  default?: (report: ExportableReport, format: ExportFormat) => Promise<ExportResult> | ExportResult;
};

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  favorites: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

const idParamsSchema = z.object({
  id: z.string().min(1),
});

const exportParamsSchema = z.object({
  id: z.string().min(1),
  format: z.enum(['pdf', 'excel', 'json']),
});

const compareSchema = z.object({
  reportIds: z.array(z.string().min(1)).min(2).max(10),
});

const parseReportData = <T extends { data: string | null }>(report: T): Omit<T, 'data'> & { data: unknown } => ({
  ...report,
  data: parseJson(report.data),
});

const parseJson = (value: string | null): unknown => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const exportMetadata = (format: ExportFormat): { mimeType: string; extension: string } => {
  if (format === 'pdf') {
    return { mimeType: 'application/pdf', extension: 'pdf' };
  }

  if (format === 'excel') {
    return {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    };
  }

  return { mimeType: 'application/json', extension: 'json' };
};

const getExportContent = async (report: ExportableReport, format: ExportFormat): Promise<ExportResult> => {
  const exporter = reportExport as ReportExportModule;

  if (exporter.exportReport) {
    return exporter.exportReport(report, format);
  }

  if (format === 'pdf' && exporter.exportReportToPdf) {
    return exporter.exportReportToPdf(report);
  }

  if (format === 'excel' && exporter.exportReportToExcel) {
    return exporter.exportReportToExcel(report);
  }

  if (exporter.default) {
    return exporter.default(report, format);
  }

  if (format === 'json') {
    return JSON.stringify(report, null, 2);
  }

  throw new AppError('Report export service is unavailable', 501, 'EXPORT_UNAVAILABLE');
};

const sendExport = (res: Response, reportId: string, format: ExportFormat, result: ExportResult): void => {
  const metadata = exportMetadata(format);
  const filename = `seo-report-${reportId}.${metadata.extension}`;
  let content: Buffer | string = result as Buffer | string;
  let mimeType = metadata.mimeType;
  let downloadName = filename;

  if (typeof result === 'object' && !Buffer.isBuffer(result)) {
    content = result.buffer ?? result.content ?? result.data ?? '';
    mimeType = result.mimeType ?? mimeType;
    downloadName = result.filename ?? result.fileName ?? downloadName;
  }

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  res.send(content);
};

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;
    const where = {
      userId: req.user!.id,
      ...(query.favorites !== undefined ? { favorite: query.favorites } : {}),
      ...(query.search
        ? {
            OR: [
              { url: { contains: query.search } },
              { domain: { contains: query.search } },
              { summary: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
        select: {
          id: true,
          url: true,
          domain: true,
          status: true,
          progress: true,
          statusMessage: true,
          errorMessage: true,
          seoScore: true,
          performanceScore: true,
          healthScore: true,
          summary: true,
          favorite: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
        },
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
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const report = await prisma.report.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    res.json({ report: parseReportData(report) });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const report = await prisma.report.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
      select: { id: true },
    });

    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    await prisma.report.delete({ where: { id } });
    res.status(204).send();
  }),
);

router.post(
  '/:id/favorite',
  asyncHandler(async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const report = await prisma.report.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    const favorite = !report.favorite;
    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id },
        data: { favorite },
      });

      if (favorite) {
        await tx.favorite.upsert({
          where: {
            userId_reportId: {
              userId: req.user!.id,
              reportId: id,
            },
          },
          update: {},
          create: {
            userId: req.user!.id,
            reportId: id,
          },
        });
      } else {
        await tx.favorite.deleteMany({
          where: {
            userId: req.user!.id,
            reportId: id,
          },
        });
      }
    });

    res.json({ reportId: id, favorite });
  }),
);

router.get(
  '/:id/export/:format',
  asyncHandler(async (req, res) => {
    const { id, format } = exportParamsSchema.parse(req.params);
    const report = await prisma.report.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }

    const parsedReport = parseReportData(report);
    const result = await getExportContent(parsedReport, format);
    sendExport(res, id, format, result);
  }),
);

router.post(
  '/compare',
  asyncHandler(async (req, res) => {
    const input = compareSchema.parse(req.body);
    const reportIds = [...new Set(input.reportIds)];
    const reports = await prisma.report.findMany({
      where: {
        userId: req.user!.id,
        id: { in: reportIds },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (reports.length !== reportIds.length) {
      throw new AppError('One or more reports were not found', 404, 'REPORTS_NOT_FOUND');
    }

    res.json({
      reports: reports.map((report) => ({
        id: report.id,
        url: report.url,
        domain: report.domain,
        createdAt: report.createdAt,
        completedAt: report.completedAt,
        scores: {
          seo: report.seoScore,
          performance: report.performanceScore,
          health: report.healthScore,
        },
        summary: report.summary,
      })),
    });
  }),
);

export default router;
