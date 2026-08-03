import dotenv from "dotenv";

dotenv.config();

const optional = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const numberFromEnv = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export interface AppConfig {
  env: string;
  port: number;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  urls: {
    client: string;
    api: string;
    googleCallback?: string;
  };
  databaseUrl?: string;
  apiKeys: {
    openai?: string;
    gemini?: string;
    pagespeed?: string;
    serpapi?: string;
    dataForSeoLogin?: string;
    dataForSeoPassword?: string;
  };
  google: {
    clientId?: string;
    clientSecret?: string;
  };
  smtp: {
    host?: string;
    port: number;
    user?: string;
    pass?: string;
    from: string;
    secure: boolean;
  };
}

export const config: AppConfig = {
  env: process.env.NODE_ENV ?? "development",
  port: numberFromEnv(process.env.PORT, 4000),
  jwt: {
    secret: optional(process.env.JWT_SECRET) ?? "change-me-to-a-long-random-secret",
    expiresIn: optional(process.env.JWT_EXPIRES_IN) ?? "7d",
  },
  urls: {
    client: optional(process.env.CLIENT_URL) ?? "http://localhost:5173",
    api: optional(process.env.API_URL) ?? "http://localhost:4000",
    googleCallback: optional(process.env.GOOGLE_CALLBACK_URL),
  },
  databaseUrl: optional(process.env.DATABASE_URL),
  apiKeys: {
    openai: optional(process.env.OPENAI_API_KEY),
    gemini: optional(process.env.GEMINI_API_KEY),
    pagespeed: optional(process.env.PAGESPEED_API_KEY),
    serpapi: optional(process.env.SERPAPI_KEY),
    dataForSeoLogin: optional(process.env.DATAFORSEO_LOGIN),
    dataForSeoPassword: optional(process.env.DATAFORSEO_PASSWORD),
  },
  google: {
    clientId: optional(process.env.GOOGLE_CLIENT_ID),
    clientSecret: optional(process.env.GOOGLE_CLIENT_SECRET),
  },
  smtp: {
    host: optional(process.env.SMTP_HOST),
    port: numberFromEnv(process.env.SMTP_PORT, 587),
    user: optional(process.env.SMTP_USER),
    pass: optional(process.env.SMTP_PASS),
    from: optional(process.env.EMAIL_FROM) ?? "noreply@seovision.ai",
    secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
  },
};

export default config;
