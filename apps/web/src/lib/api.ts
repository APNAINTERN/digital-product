import axios, { type AxiosError } from 'axios'

export const authTokenStorageKey = 'seo-vision-token'

/** Production: set VITE_API_URL to your API origin, e.g. https://api.example.com */
const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')

export const apiBaseUrl = configuredApiUrl ? `${configuredApiUrl}/api` : '/api'

export type ApiErrorPayload = {
  message?: string
  error?: string
  code?: string
  details?: unknown
}

export const getApiErrorMessage = (error: unknown, fallback = 'Something went wrong') => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string | { message?: string; code?: string } }
      | string
      | undefined

    if (typeof data === 'string') {
      if (/page could not be found|NOT_FOUND/i.test(data)) {
        return 'The page could not be found'
      }
      const trimmed = data.trim()
      if (trimmed) return trimmed.slice(0, 300)
    }

    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') return data.message
      if (typeof data.error === 'string') return data.error
      if (data.error && typeof data.error === 'object' && typeof data.error.message === 'string') {
        return data.error.message
      }
    }

    if (error.response?.status === 404) return 'The page could not be found'
    return error.message || fallback
  }

  return error instanceof Error ? error.message : fallback
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(authTokenStorageKey)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.response?.status === 401) {
      window.localStorage.removeItem(authTokenStorageKey)
      window.localStorage.removeItem('seo-vision-user')

      if (window.location.pathname.startsWith('/app')) {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  },
)

export default api
