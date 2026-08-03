import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import * as config from '../config.js';
import {
  getSupabaseUserFromToken,
  isSupabaseAuthEnabled,
  upsertAppUserFromSupabase,
} from '../lib/supabase.js';
import { AppError } from './errorHandler.js';

export type AuthenticatedUser = {
  id: string;
  email: string;
  passwordHash?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  emailVerified: boolean;
  verificationToken?: string | null;
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
  googleId?: string | null;
  apiCallsUsed: number;
  apiCallsLimit: number;
  theme: string;
  createdAt: Date;
  updatedAt: Date;
};

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}

    interface Request {
      authToken?: string;
    }
  }
}

type JwtPayload = {
  userId: string;
};

const configValue = (key: string, fallback = ''): string => {
  const moduleConfig = config as Record<string, unknown>;
  const appConfig = moduleConfig.config as
    | {
        jwt?: { secret?: string; expiresIn?: string };
        urls?: { client?: string; api?: string; googleCallback?: string };
        google?: { clientId?: string; clientSecret?: string };
        port?: number;
      }
    | undefined;
  const nestedValues: Record<string, string | number | undefined> = {
    JWT_SECRET: appConfig?.jwt?.secret,
    JWT_EXPIRES_IN: appConfig?.jwt?.expiresIn,
    CLIENT_URL: appConfig?.urls?.client,
    API_URL: appConfig?.urls?.api,
    GOOGLE_CALLBACK_URL: appConfig?.urls?.googleCallback,
    GOOGLE_CLIENT_ID: appConfig?.google?.clientId,
    GOOGLE_CLIENT_SECRET: appConfig?.google?.clientSecret,
    PORT: appConfig?.port,
  };
  const configured = moduleConfig[key] ?? nestedValues[key];
  return typeof configured === 'string' && configured.length > 0 ? configured : (process.env[key] ?? fallback);
};

const getJwtSecret = (): string => {
  const secret = configValue('JWT_SECRET');
  if (!secret) {
    throw new AppError('JWT secret is not configured', 500, 'JWT_SECRET_MISSING');
  }

  return secret;
};

const getBearerToken = (authorization?: string): string | undefined => {
  if (!authorization) {
    return undefined;
  }

  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return undefined;
  }

  return token;
};

const getRequestToken = (req: Parameters<RequestHandler>[0]): string | undefined => {
  const bearerToken = getBearerToken(req.headers.authorization);
  if (bearerToken) {
    return bearerToken;
  }

  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  return cookies?.auth_token ?? cookies?.token ?? cookies?.jwt;
};

const tryLocalJwt = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded !== 'object' || decoded === null || typeof decoded.userId !== 'string') {
      return null;
    }
    return { userId: decoded.userId };
  } catch {
    return null;
  }
};

const resolveUserFromToken = async (token: string): Promise<AuthenticatedUser | null> => {
  const local = tryLocalJwt(token);
  if (local) {
    return prisma.user.findUnique({ where: { id: local.userId } });
  }

  if (!isSupabaseAuthEnabled()) {
    return null;
  }

  const supabaseUser = await getSupabaseUserFromToken(token);
  if (!supabaseUser) {
    return null;
  }

  return upsertAppUserFromSupabase(supabaseUser);
};

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = getRequestToken(req);
    if (!token) {
      return next();
    }

    const user = await resolveUserFromToken(token);
    if (user) {
      req.user = user;
      req.authToken = token;
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = getRequestToken(req);
    if (!token) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const user = await resolveUserFromToken(token);
    if (!user) {
      throw new AppError('Invalid or expired authentication token', 401, 'INVALID_TOKEN');
    }

    req.user = user;
    req.authToken = token;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  if (req.user.role !== 'ADMIN') {
    return next(new AppError('Admin access required', 403, 'ADMIN_REQUIRED'));
  }

  return next();
};

export {};
