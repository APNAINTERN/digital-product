import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { ReportStatus } from '../types'

export type ReportStatusPayload = {
  id: string
  status: ReportStatus
  progress: number
  statusMessage?: string | null
  errorMessage?: string | null
  seoScore?: number | null
  performanceScore?: number | null
  healthScore?: number | null
  completedAt?: string | null
  updatedAt?: string
}

export function useReportStatus(reportId?: string | null) {
  return useQuery({
    queryKey: ['report-status', reportId],
    enabled: Boolean(reportId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'COMPLETED' || status === 'FAILED' ? false : 1500
    },
    queryFn: async () => {
      const { data } = await api.get<{ report: ReportStatusPayload }>(`/analyze/${reportId}/status`)
      return data.report
    },
  })
}
