import { api, getApiErrorMessage } from '@/lib/api'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { User } from '@/types'

type AuthResponse = {
  token: string
  user: User
}

const syncSupabaseSession = async (accessToken: string): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/supabase/sync', { accessToken })
  return data
}

/**
 * Register only via our API.
 * Do NOT fall back to supabase.auth.signUp() — that sends confirmation emails and
 * hits "email rate limit exceeded" on free Supabase projects.
 */
export const registerWithPassword = async (
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse & { needsEmailConfirmation?: boolean; info?: string }> => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/register', { name, email, password })
    return data
  } catch (apiError) {
    const apiMessage = getApiErrorMessage(apiError, 'Unable to create account')

    if (/page could not be found|NOT_FOUND|404/i.test(apiMessage)) {
      throw new Error(
        'API route not reachable on Vercel. Redeploy latest main (api/index rewrite fix). Then open /api/health.',
      )
    }

    if (/DB_NOT_READY|Database is not ready|DATABASE_URL/i.test(apiMessage)) {
      throw new Error(
        'Database not configured. In Vercel set DATABASE_URL to your Supabase Postgres URI (Database → Connect → URI) with ?sslmode=require, then Redeploy.',
      )
    }

    throw new Error(apiMessage)
  }
}

/**
 * Login: API first (no email confirm). Supabase only as secondary if API user missing.
 */
export const loginWithPassword = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
    return data
  } catch (apiError) {
    const apiMessage = getApiErrorMessage(apiError, '')

    if (/page could not be found|NOT_FOUND|DB_NOT_READY|Database is not ready/i.test(apiMessage)) {
      throw new Error(
        apiMessage.includes('Database') || apiMessage.includes('DB_NOT_READY')
          ? 'Database not configured. Set DATABASE_URL (Supabase Postgres URI) in Vercel, then Redeploy.'
          : 'API not reachable. Redeploy latest main and check /api/health.',
      )
    }

    // Optional Supabase login only when API responded with invalid credentials
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(apiMessage || 'Unable to sign in')
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const hint = /confirm|not confirmed/i.test(error.message)
        ? ' Confirm your email, or disable Confirm email in Supabase Auth settings.'
        : ''
      throw new Error(`${error.message}${hint}`)
    }
    if (!data.session?.access_token) {
      throw new Error('Supabase did not return a session.')
    }

    try {
      return await syncSupabaseSession(data.session.access_token)
    } catch (syncError) {
      throw new Error(
        getApiErrorMessage(
          syncError,
          'Supabase login worked, but app sync failed. Set DATABASE_URL in Vercel.',
        ),
      )
    }
  }
}

export const requestPasswordReset = async (email: string): Promise<string> => {
  try {
    const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email })
    return data.message
  } catch {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Unable to request password reset')
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      throw new Error(
        /rate limit/i.test(error.message)
          ? 'Email rate limit exceeded. Wait a few minutes, or reset via Supabase Dashboard → Authentication → Users.'
          : error.message,
      )
    }
    return 'If an account exists, password reset instructions have been sent.'
  }
}

export const updatePasswordWithSupabase = async (password: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured')
  }
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
}

export const logoutAuth = async (): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut()
  }
}
