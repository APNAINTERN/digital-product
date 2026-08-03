import axios, { type AxiosError } from 'axios'

export const authTokenStorageKey = 'seo-vision-token'

export type ApiErrorPayload = {
  message?: string
  error?: string
  code?: string
  details?: unknown
}

export const getApiErrorMessage = (error: unknown, fallback = 'Something went wrong') => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string | { message?: string } }
      | undefined
    if (typeof data?.message === 'string') return data.message
    if (typeof data?.error === 'string') return data.error
    if (data?.error && typeof data.error === 'object' && typeof data.error.message === 'string') {
      return data.error.message
    }
    return error.message || fallback
  }

  return error instanceof Error ? error.message : fallback
}

export const api = axios.create({
  baseURL: '/api',
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
