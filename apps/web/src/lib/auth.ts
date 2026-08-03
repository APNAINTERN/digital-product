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

export const loginWithPassword = async (email: string, password: string): Promise<AuthResponse> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw new Error(error.message)
    }
    if (!data.session?.access_token) {
      throw new Error('Supabase did not return a session. Check email confirmation settings.')
    }
    return syncSupabaseSession(data.session.access_token)
  }

  try {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
    return data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to sign in'))
  }
}

export const registerWithPassword = async (
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse & { needsEmailConfirmation?: boolean }> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    if (error) {
      throw new Error(error.message)
    }

    if (!data.session?.access_token) {
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
      }
    }

    return syncSupabaseSession(data.session.access_token)
  }

  try {
    const { data } = await api.post<AuthResponse>('/auth/register', { name, email, password })
    return data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to create account'))
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
