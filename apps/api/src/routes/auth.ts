import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { CookieOptions, RequestHandler } from 'express';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { Profile, VerifyCallback } from 'passport-google-oauth20';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import * as mail from '../lib/mail.js';
import * as config from '../config.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import type { AuthenticatedUser } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import {
  getSupabaseUserFromToken,
  isSupabaseAuthEnabled,
  upsertAppUserFromSupabase,
} from '../lib/supabase.js';

const router = Router();

const configValue = (key: string, fallback = ''): string => {
  const moduleConfig = config as Record<string, unknown>;
  const appConfig = moduleConfig.config as
    | {
        jwt?: { secret?: string; expiresIn?: string };
        urls?: { client?: string; api?: string; googleCallback?: string };
        google?: { clientId?: string; clientSecret?: string };
      }
    | undefined;
  const nestedValues: Record<string, string | undefined> = {
    JWT_SECRET: appConfig?.jwt?.secret,
    JWT_EXPIRES_IN: appConfig?.jwt?.expiresIn,
    CLIENT_URL: appConfig?.urls?.client,
    API_URL: appConfig?.urls?.api,
    GOOGLE_CALLBACK_URL: appConfig?.urls?.googleCallback,
    GOOGLE_CLIENT_ID: appConfig?.google?.clientId,
    GOOGLE_CLIENT_SECRET: appConfig?.google?.clientSecret,
  };
  const configured = moduleConfig[key] ?? nestedValues[key];
  return typeof configured === 'string' && configured.length > 0 ? configured : (process.env[key] ?? fallback);
};

const JWT_SECRET = configValue('JWT_SECRET');
const JWT_EXPIRES_IN = configValue('JWT_EXPIRES_IN', '7d');
const CLIENT_URL = configValue('CLIENT_URL', 'http://localhost:5173');
const API_URL = configValue('API_URL', 'http://localhost:4000');
const GOOGLE_CLIENT_ID = configValue('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = configValue('GOOGLE_CLIENT_SECRET');
const GOOGLE_CALLBACK_URL = configValue('GOOGLE_CALLBACK_URL', `${API_URL}/api/auth/google/callback`);
const isProduction = process.env.NODE_ENV === 'production';
const authCookieName = 'auth_token';

type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type MailModule = {
  sendEmail?: (message: EmailMessage) => Promise<unknown> | unknown;
  sendMail?: (message: EmailMessage) => Promise<unknown> | unknown;
  default?: (message: EmailMessage) => Promise<unknown> | unknown;
};

const sendEmail = async (message: EmailMessage): Promise<void> => {
  const mailer = mail as MailModule;
  const sender = mailer.sendEmail ?? mailer.sendMail ?? mailer.default;

  if (!sender) {
    console.info('Email sender unavailable; message:', {
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return;
  }

  await sender(message);
};

const publicUser = (user: AuthenticatedUser) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
  role: user.role,
  plan: user.plan,
  emailVerified: user.emailVerified,
  apiCallsUsed: user.apiCallsUsed,
  apiCallsLimit: user.apiCallsLimit,
  theme: user.theme,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const requireJwtSecret = (): string => {
  if (!JWT_SECRET) {
    throw new AppError('JWT secret is not configured', 500, 'JWT_SECRET_MISSING');
  }

  return JWT_SECRET;
};

const issueToken = (userId: string): string =>
  jwt.sign({ userId }, requireJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });

const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

const setAuthCookie = (res: Parameters<RequestHandler>[1], token: string): void => {
  res.cookie(authCookieName, token, authCookieOptions);
};

const sendAuthResponse = (res: Parameters<RequestHandler>[1], user: AuthenticatedUser, statusCode = 200): void => {
  const token = issueToken(user.id);
  setAuthCookie(res, token);
  res.status(statusCode).json({ token, user: publicUser(user) });
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const randomToken = (): string => crypto.randomBytes(32).toString('hex');

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters long');

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email(),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

const resendVerificationSchema = z.object({
  email: z.string().trim().email().optional(),
});

const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(100).nullable().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    avatarUrl: z.string().trim().url().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  const verifyUrl = `${CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: 'Verify your SEO Vision AI email',
    html: `<p>Welcome to SEO Vision AI.</p><p>Verify your email address by clicking <a href="${verifyUrl}">this link</a>.</p>`,
    text: `Verify your SEO Vision AI email: ${verifyUrl}`,
  });
};

const sendResetPasswordEmail = async (email: string, token: string): Promise<void> => {
  const resetUrl = `${CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: 'Reset your SEO Vision AI password',
    html: `<p>Reset your SEO Vision AI password by clicking <a href="${resetUrl}">this link</a>.</p><p>This link expires in one hour.</p>`,
    text: `Reset your SEO Vision AI password: ${resetUrl}`,
  });
};

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const email = normalizeEmail(input.email);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('A user with this email already exists', 409, 'EMAIL_IN_USE');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const verificationToken = randomToken();
    const user = await prisma.user.create({
      data: {
        email,
        name: input.name,
        passwordHash,
        verificationToken,
        apiCallsLimit: 10,
      },
    });

    await sendVerificationEmail(user.email, verificationToken);
    sendAuthResponse(res, user, 201);
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const email = normalizeEmail(input.email);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user?.passwordHash) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!validPassword) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    sendAuthResponse(res, user);
  }),
);

router.post(
  '/supabase/sync',
  asyncHandler(async (req, res) => {
    if (!isSupabaseAuthEnabled()) {
      throw new AppError('Supabase auth is not configured on the server', 501, 'SUPABASE_DISABLED');
    }

    const body = z
      .object({
        accessToken: z.string().min(1).optional(),
      })
      .parse(req.body);

    const accessToken =
      body.accessToken ||
      (typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : undefined);

    if (!accessToken) {
      throw new AppError('Supabase access token is required', 400, 'MISSING_ACCESS_TOKEN');
    }

    const supabaseUser = await getSupabaseUserFromToken(accessToken);
    if (!supabaseUser) {
      throw new AppError('Invalid Supabase session', 401, 'INVALID_SUPABASE_SESSION');
    }

    const user = await upsertAppUserFromSupabase(supabaseUser);
    // Keep using the Supabase access token as the API bearer token.
    setAuthCookie(res, accessToken);
    res.json({ token: accessToken, user: publicUser(user) });
  }),
);

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const input = forgotPasswordSchema.parse(req.body);
    const email = normalizeEmail(input.email);
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const resetToken = randomToken();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      await sendResetPasswordEmail(user.email, resetToken);
    }

    res.json({ message: 'If an account exists, password reset instructions have been sent.' });
  }),
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const input = resetPasswordSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: {
        resetToken: input.token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    sendAuthResponse(res, updatedUser);
  }),
);

router.get(
  '/verify-email',
  asyncHandler(async (req, res) => {
    const token = z.string().min(1).parse(req.query.token);
    const user = await prisma.user.findFirst({ where: { verificationToken: token } });

    if (!user) {
      throw new AppError('Invalid verification token', 400, 'INVALID_VERIFICATION_TOKEN');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    res.json({ message: 'Email verified successfully' });
  }),
);

router.post(
  '/resend-verification',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const input = resendVerificationSchema.parse(req.body ?? {});
    const email = input.email ? normalizeEmail(input.email) : req.user?.email;
    if (!email) {
      throw new AppError('Email is required', 400, 'EMAIL_REQUIRED');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (user.emailVerified) {
      res.json({ message: 'Email is already verified' });
      return;
    }

    const verificationToken = randomToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken },
    });
    await sendVerificationEmail(user.email, verificationToken);

    res.json({ message: 'Verification email sent' });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user!) });
  }),
);

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = updateMeSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: input,
    });

    res.json({ user: publicUser(user) });
  }),
);

router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user?.passwordHash) {
      throw new AppError('Password changes are not available for this account', 400, 'PASSWORD_UNAVAILABLE');
    }

    const validPassword = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!validPassword) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ message: 'Password updated successfully' });
  }),
);

const googleOAuthEnabled = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

const oauthNotConfigured: RequestHandler = (_req, res) => {
  res.status(501).json({
    message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.',
  });
};

const upsertGoogleUser = async (profile: Profile): Promise<AuthenticatedUser> => {
  const googleId = profile.id;
  const email = profile.emails?.[0]?.value ? normalizeEmail(profile.emails[0].value) : undefined;

  if (!email) {
    throw new AppError('Google account did not provide an email address', 400, 'GOOGLE_EMAIL_REQUIRED');
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ googleId }, { email }],
    },
  });

  const displayName = profile.displayName || [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(' ');
  const avatarUrl = profile.photos?.[0]?.value;

  if (existingUser) {
    return prisma.user.update({
      where: { id: existingUser.id },
      data: {
        googleId,
        emailVerified: true,
        name: existingUser.name ?? displayName ?? undefined,
        avatarUrl: existingUser.avatarUrl ?? avatarUrl ?? undefined,
      },
    });
  }

  return prisma.user.create({
    data: {
      email,
      googleId,
      name: displayName || undefined,
      avatarUrl,
      emailVerified: true,
      apiCallsLimit: 10,
    },
  });
};

if (googleOAuthEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
        try {
          const user = await upsertGoogleUser(profile);
          done(null, user);
        } catch (error) {
          done(error);
        }
      },
    ),
  );
}

router.get(
  '/google',
  googleOAuthEnabled
    ? passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
      })
    : oauthNotConfigured,
);

router.get(
  '/google/callback',
  googleOAuthEnabled
    ? [
        passport.authenticate('google', {
          session: false,
          failureRedirect: `${CLIENT_URL}/login?error=google_oauth_failed`,
        }),
        ((req, res) => {
          const user = req.user as AuthenticatedUser | undefined;
          if (!user) {
            throw new AppError('Google authentication failed', 401, 'GOOGLE_AUTH_FAILED');
          }

          const token = issueToken(user.id);
          setAuthCookie(res, token);
          res.redirect(`${CLIENT_URL}/auth/callback?token=${encodeURIComponent(token)}`);
        }) satisfies RequestHandler,
      ]
    : oauthNotConfigured,
);

export default router;
