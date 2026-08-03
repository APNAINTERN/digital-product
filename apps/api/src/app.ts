import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from 'passport';
import adminRoutes from './routes/admin.js';
import analyzeRoutes from './routes/analyze.js';
import authRoutes from './routes/auth.js';
import billingRoutes from './routes/billing.js';
import contactRoutes from './routes/contact.js';
import notificationsRoutes from './routes/notifications.js';
import reportsRoutes from './routes/reports.js';
import usageRoutes from './routes/usage.js';
import websitesRoutes from './routes/websites.js';
import { AppError, errorHandler } from './middleware/errorHandler.js';
import * as config from './config.js';

const configValue = (key: string, fallback = ''): string => {
  const moduleConfig = config as Record<string, unknown>;
  const appConfig = moduleConfig.config as { urls?: { client?: string } } | undefined;
  const nestedValues: Record<string, string | undefined> = {
    CLIENT_URL: appConfig?.urls?.client,
  };
  const configured = moduleConfig[key] ?? nestedValues[key];
  return typeof configured === 'string' && configured.length > 0 ? configured : (process.env[key] ?? fallback);
};

const CLIENT_URL = configValue('CLIENT_URL', 'http://localhost:5173');

const app = express();

const allowedOrigins = new Set(
  [
    ...CLIENT_URL.split(',').map((origin) => origin.trim()),
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '',
  ].filter(Boolean),
);

const isAllowedOrigin = (origin?: string | null): boolean => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin ?? ''} not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many authentication requests, please try again later.',
      code: 'RATE_LIMITED',
    },
  },
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'seo-vision-api',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/websites', websitesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

app.use('/api', (_req, _res, next) => {
  next(new AppError('API route not found', 404, 'ROUTE_NOT_FOUND'));
});

app.use(errorHandler);

export default app;
