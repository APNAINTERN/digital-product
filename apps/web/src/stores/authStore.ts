import { create } from 'zustand'
import { api, authTokenStorageKey } from '@/lib/api'
import { logoutAuth } from '@/lib/auth'
import type { User } from '@/types'

const userStorageKey = 'seo-vision-user'

type AuthState = {
  user: User | null
  token: string | null
  isHydrated: boolean
  setAuth: (payload: { user: User; token: string }) => void
  setUser: (user: User | null) => void
  fetchMe: () => Promise<User | null>
  logout: () => void
  hydrate: () => void
}

const parseStoredUser = (value: string | null): User | null => {
  if (!value) return null

  try {
    return JSON.parse(value) as User
  } catch {
    window.localStorage.removeItem(userStorageKey)
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isHydrated: false,
  setAuth: ({ user, token }) => {
    window.localStorage.setItem(authTokenStorageKey, token)
    window.localStorage.setItem(userStorageKey, JSON.stringify(user))
    set({ user, token, isHydrated: true })
  },
  setUser: (user) => {
    if (user) {
      window.localStorage.setItem(userStorageKey, JSON.stringify(user))
    } else {
      window.localStorage.removeItem(userStorageKey)
    }

    set({ user })
  },
  fetchMe: async () => {
    try {
      const { data } = await api.get<{ user: User }>('/auth/me')
      window.localStorage.setItem(userStorageKey, JSON.stringify(data.user))
      set({ user: data.user, isHydrated: true })
      return data.user
    } catch {
      set({ user: null, isHydrated: true })
      return null
    }
  },
  logout: () => {
    void logoutAuth()
    window.localStorage.removeItem(authTokenStorageKey)
    window.localStorage.removeItem(userStorageKey)
    set({ user: null, token: null, isHydrated: true })
  },
  hydrate: () => {
    set({
      user: parseStoredUser(window.localStorage.getItem(userStorageKey)),
      token: window.localStorage.getItem(authTokenStorageKey),
      isHydrated: true,
    })
  },
}))

export const hydrateAuthStore = () => useAuthStore.getState().hydrate()
