import { createClient, type SupabaseClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { prisma } from './prisma.js';
import type { AuthenticatedUser } from '../middleware/auth.js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';

const supabaseKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

let client: SupabaseClient | null = null;

export const isSupabaseAuthEnabled = (): boolean => Boolean(supabaseUrl && supabaseKey);

export const getSupabaseAdmin = (): SupabaseClient | null => {
  if (!isSupabaseAuthEnabled()) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return client;
};

export const getSupabaseUserFromToken = async (token: string): Promise<SupabaseUser | null> => {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
};

const planLimit = (plan: AuthenticatedUser['plan']): number => {
  switch (plan) {
    case 'STARTER':
      return 50;
    case 'PRO':
      return 200;
    case 'ENTERPRISE':
      return 2000;
    default:
      return 10;
  }
};

export const upsertAppUserFromSupabase = async (supabaseUser: SupabaseUser): Promise<AuthenticatedUser> => {
  const email = (supabaseUser.email ?? '').trim().toLowerCase();
  if (!email) {
    throw new Error('Supabase user is missing an email address');
  }

  const name =
    (typeof supabaseUser.user_metadata?.name === 'string' && supabaseUser.user_metadata.name) ||
    (typeof supabaseUser.user_metadata?.full_name === 'string' && supabaseUser.user_metadata.full_name) ||
    email.split('@')[0];

  const avatarUrl =
    (typeof supabaseUser.user_metadata?.avatar_url === 'string' && supabaseUser.user_metadata.avatar_url) ||
    null;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: existing.name ?? name,
        avatarUrl: existing.avatarUrl ?? avatarUrl,
        emailVerified: Boolean(supabaseUser.email_confirmed_at) || existing.emailVerified,
      },
    });
  }

  const isAdmin = email === 'admin@seovision.ai';
  const plan = isAdmin ? 'ENTERPRISE' : email === 'demo@seovision.ai' ? 'PRO' : 'FREE';

  return prisma.user.create({
    data: {
      email,
      name,
      avatarUrl,
      role: isAdmin ? 'ADMIN' : 'USER',
      plan,
      emailVerified: Boolean(supabaseUser.email_confirmed_at) || true,
      apiCallsLimit: planLimit(plan),
      apiCallsUsed: 0,
      theme: 'system',
      passwordHash: null,
    },
  });
};
