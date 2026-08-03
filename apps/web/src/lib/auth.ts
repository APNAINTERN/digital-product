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

const mirrorToSupabase = async (email: string, password: string, name?: string) => {
  if (!isSupabaseConfigured || !supabase) return
  try {
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: name ? { name } : undefined,
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
  } catch {
    // Best-effort only — local API account is the source of truth for app access.
  }
}

/**
 * Account creation prefers our API (no email-confirm gate).
 * Supabase mirroring is best-effort because this project has Confirm Email enabled.
 */
export const registerWithPassword = async (
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse & { needsEmailConfirmation?: boolean; info?: string }> => {
  // 1) Primary: local API register (works immediately for /app)
  try {
    const { data } = await api.post<AuthResponse>('/auth/register', { name, email, password })
    void mirrorToSupabase(email, password, name)
    return data
  } catch (apiError) {
    const apiMessage = getApiErrorMessage(apiError, '')

    // 2) Fallback: Supabase Auth if API/DB is unavailable
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        apiMessage ||
          'Unable to create account. Set DATABASE_URL on the server, or configure Supabase Auth.',
      )
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    if (error) {
      throw new Error(
        `${error.message}${apiMessage ? ` (API also failed: ${apiMessage})` : ''}`,
      )
    }

    if (!data.session?.access_token) {
      // Supabase created the user but Confirm Email is ON — no session yet.
      return {
        token: '',
        user: {
          id: data.user?.id ?? '',
          email,
          name,
          role: 'USER',
          plan: 'FREE',
          emailVerified: false,
          apiCallsUsed: 0,
          apiCallsLimit: 10,
          theme: 'system',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        needsEmailConfirmation: true,
        info:
          'Account created in Supabase. Confirm your email (check spam), OR in Supabase Dashboard → Authentication → Providers → Email turn OFF “Confirm email”, then sign in.',
      }
    }

    try {
      return await syncSupabaseSession(data.session.access_token)
    } catch (syncError) {
      throw new Error(
        getApiErrorMessage(
          syncError,
          'Supabase signup worked, but app sync failed. Set DATABASE_URL (Supabase Postgres URI) in Vercel env vars.',
        ),
      )
    }
  }
}

export const loginWithPassword = async (email: string, password: string): Promise<AuthResponse> => {
  // 1) Primary: local API login (no email confirmation required)
  try {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
    return data
  } catch (apiError) {
    const apiMessage = getApiErrorMessage(apiError, '')

    if (!isSupabaseConfigured || !supabase) {
      throw new Error(apiMessage || 'Unable to sign in')
    }

    // 2) Fallback: Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const hint =
        /confirm|verification|not confirmed/i.test(error.message)
          ? ' Email confirmation is enabled in Supabase — confirm the email, or disable “Confirm email” in Supabase Auth settings.'
          : ''
      throw new Error(
        `${error.message}${hint}${apiMessage ? ` (API: ${apiMessage})` : ''}`,
      )
    }
    if (!data.session?.access_token) {
      throw new Error('Supabase did not return a session. Check email confirmation settings.')
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
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      throw new Error(error.message)
    }
    return 'If an account exists, password reset instructions have been sent.'
  }

  const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email })
  return data.message
}

export const updatePasswordWithSupabase = async (password: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured')
  }
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    throw new Error(error.message)
  }
}

export const logoutAuth = async (): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut()
  }
}
