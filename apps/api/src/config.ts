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

const DEFAULT_SUPABASE_URL = "https://hflapipozwwwinbbfpuh.supabase.co";

const extractSupabaseRef = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname; // hflapipozwwwinbbfpuh.supabase.co
    const ref = host.split(".")[0];
    return ref || undefined;
  } catch {
    return undefined;
  }
};

/**
 * Resolve Postgres URL for Prisma.
 * Accepts full DATABASE_URL, or builds one from SUPABASE_DB_PASSWORD + project ref.
 */
export const resolveDatabaseUrl = (): string | undefined => {
  const direct =
    optional(process.env.DATABASE_URL) ||
    optional(process.env.POSTGRES_URL) ||
    optional(process.env.POSTGRES_PRISMA_URL) ||
    optional(process.env.POSTGRES_URL_NON_POOLING);

  if (direct) {
    return direct.includes("sslmode=") ? direct : `${direct}${direct.includes("?") ? "&" : "?"}sslmode=require`;
  }

  const password =
    optional(process.env.SUPABASE_DB_PASSWORD) ||
    optional(process.env.SUPABASE_DATABASE_PASSWORD) ||
    optional(process.env.DB_PASSWORD);

  if (!password) return undefined;

  const supabaseUrl =
    optional(process.env.SUPABASE_URL) ||
    optional(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    optional(process.env.VITE_SUPABASE_URL) ||
    DEFAULT_SUPABASE_URL;

  const projectRef = extractSupabaseRef(supabaseUrl) ?? "hflapipozwwwinbbfpuh";
  const encoded = encodeURIComponent(password);

  // Direct DB host (region-independent). Pooler also works if SUPABASE_POOLER_HOST is set.
  const poolerHost = optional(process.env.SUPABASE_POOLER_HOST);
  if (poolerHost) {
    return `postgresql://postgres.${projectRef}:${encoded}@${poolerHost}/postgres?sslmode=require`;
  }

  return `postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
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
  databaseUrl: resolveDatabaseUrl(),
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

// Ensure Prisma / pg see the resolved URL even when only SUPABASE_DB_PASSWORD is set.
if (config.databaseUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = config.databaseUrl;
}

export default config;
