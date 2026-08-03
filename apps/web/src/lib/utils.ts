import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const formatNumber = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en', { notation: value >= 10000 ? 'compact' : 'standard' }).format(value)
}

export const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

export const scoreTone = (score: number | null | undefined): 'good' | 'warning' | 'danger' | 'muted' => {
  if (typeof score !== 'number') return 'muted'
  if (score >= 80) return 'good'
  if (score >= 55) return 'warning'
  return 'danger'
}

export const normalizeUrlInput = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}
