import type { Report } from '../types'

export type AnyRecord = Record<string, unknown>

export const asRecord = (value: unknown): AnyRecord => (value && typeof value === 'object' && !Array.isArray(value) ? (value as AnyRecord) : {})

export const parseJsonMaybe = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export const reportPayload = (report?: Report | null): AnyRecord => asRecord(parseJsonMaybe(report?.data))

export const getPath = (source: unknown, paths: string[]): unknown => {
  for (const path of paths) {
    const value = path.split('.').reduce<unknown>((current, part) => asRecord(current)[part], source)
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

export const getNumber = (source: unknown, paths: string[], fallback = 0): number => {
  const value = getPath(source, paths)
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export const getString = (source: unknown, paths: string[], fallback = ''): string => {
  const value = getPath(source, paths)
  return typeof value === 'string' ? value : fallback
}

export const getArray = <T = unknown>(source: unknown, paths: string[]): T[] => {
  const value = getPath(source, paths)
  return Array.isArray(value) ? (value as T[]) : []
}

export const scoreFromReport = (report: Report | undefined | null, key: 'seo' | 'performance' | 'health'): number | null => {
  const payload = reportPayload(report)
  if (key === 'seo') {
    return report?.seoScore ?? getNumber(payload, ['seoScore', 'scores.seo', 'scores.seoScore', 'seo.scores.overall'], 0)
  }
  if (key === 'performance') {
    return report?.performanceScore ?? getNumber(payload, ['performanceScore', 'scores.performance', 'scores.performanceScore', 'seo.coreWebVitals.performanceScore'], 0)
  }
  return report?.healthScore ?? getNumber(payload, ['healthScore', 'scores.health', 'scores.healthScore'], 0)
}

export const booleanLabel = (value: unknown): string => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === undefined || value === null || value === '') return '—'
  return String(value)
}
