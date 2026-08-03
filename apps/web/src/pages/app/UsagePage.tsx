import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { formatDate, formatNumber } from '../../lib/utils'
import { Badge, Button, Card, Spinner } from '../../components/ui'
import type { ApiUsage, Pagination } from '../../types'

export default function UsagePage() {
  const [page, setPage] = useState(1)
  const usageQuery = useQuery({
    queryKey: ['usage', page],
    queryFn: async () => {
      const { data } = await api.get<{ usage: ApiUsage[]; totalCredits: number; pagination: Pagination }>('/usage', { params: { page, limit: 20 } })
      return data
    },
  })

  return (
    <div className="page-shell">
      <div className="page-title"><h1>API usage</h1><p>Monitor analysis credits and endpoint activity for your account.</p></div>
      <div className="metric-grid">
        <Card><span>Total credits</span><strong className="big-number">{formatNumber(usageQuery.data?.totalCredits)}</strong></Card>
        <Card><span>Requests shown</span><strong className="big-number">{formatNumber(usageQuery.data?.usage.length)}</strong></Card>
      </div>
      <Card>
        {usageQuery.isLoading ? <Spinner /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Method</th><th>Endpoint</th><th>Status</th><th>Credits</th><th>Meta</th></tr></thead>
              <tbody>
                {(usageQuery.data?.usage ?? []).map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.createdAt)}</td>
                    <td><Badge tone="info">{entry.method}</Badge></td>
                    <td>{entry.endpoint}</td>
                    <td>{entry.status}</td>
                    <td>{entry.credits}</td>
                    <td><code>{JSON.stringify(entry.meta ?? {})}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="pagination">
        <Button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} variant="secondary">Previous</Button>
        <span>Page {usageQuery.data?.pagination.page ?? page} of {usageQuery.data?.pagination.pages ?? 1}</span>
        <Button disabled={page >= (usageQuery.data?.pagination.pages ?? 1)} onClick={() => setPage((value) => value + 1)} variant="secondary">Next</Button>
      </div>
    </div>
  )
}
