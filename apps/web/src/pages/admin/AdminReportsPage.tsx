import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { formatDate } from '../../lib/utils'
import { Badge, Button, Card, Input, ScoreRing, Spinner } from '../../components/ui'
import type { Pagination, Report, ReportStatus } from '../../types'

export default function AdminReportsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ReportStatus | ''>('')
  const [page, setPage] = useState(1)
  const reportsQuery = useQuery({
    queryKey: ['admin-reports', search, status, page],
    queryFn: async () => {
      const { data } = await api.get<{ reports: Report[]; pagination: Pagination }>('/admin/reports', { params: { search: search || undefined, status: status || undefined, page, limit: 20 } })
      return data
    },
  })

  return (
    <div className="page-shell">
      <div className="page-title"><h1>Admin reports</h1><p>Review all reports across users and pipeline statuses.</p></div>
      <Card className="toolbar">
        <Input onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search domain, URL, summary, or user" value={search} />
        <select className="sv-input" onChange={(event) => { setStatus(event.target.value as ReportStatus | ''); setPage(1) }} value={status}>
          <option value="">All statuses</option>
          <option value="QUEUED">QUEUED</option>
          <option value="CRAWLING">CRAWLING</option>
          <option value="ANALYZING">ANALYZING</option>
          <option value="GENERATING">GENERATING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="FAILED">FAILED</option>
        </select>
      </Card>
      <Card>
        {reportsQuery.isLoading ? <Spinner /> : (
          <div className="report-list">
            {(reportsQuery.data?.reports ?? []).map((report) => (
              <div className="report-row" key={report.id}>
                <ScoreRing label="SEO" score={report.seoScore} size={72} />
                <div className="report-row__main"><strong>{report.domain}</strong><p>{report.url}</p><small>{report.user?.email ?? 'Unknown user'} · {formatDate(report.createdAt)}</small></div>
                <Badge tone={report.status === 'COMPLETED' ? 'good' : report.status === 'FAILED' ? 'danger' : 'warning'}>{report.status}</Badge>
                <Link className="icon-link" to={`/app/reports/${report.id}`}>Open</Link>
              </div>
            ))}
          </div>
        )}
      </Card>
      <div className="pagination"><Button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} variant="secondary">Previous</Button><span>Page {reportsQuery.data?.pagination.page ?? page} of {reportsQuery.data?.pagination.pages ?? 1}</span><Button disabled={page >= (reportsQuery.data?.pagination.pages ?? 1)} onClick={() => setPage((value) => value + 1)} variant="secondary">Next</Button></div>
    </div>
  )
}
