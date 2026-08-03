import { useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Download, Eye, GitCompare, Star, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { apiBaseUrl } from '../../lib/api'
import { formatDate } from '../../lib/utils'
import { Button, Card, EmptyState, Input, Modal, ScoreRing, Spinner, Badge } from '../../components/ui'
import type { Pagination, Report } from '../../types'

type CompareReport = {
  id: string
  url: string
  domain: string
  scores: { seo?: number | null; performance?: number | null; health?: number | null }
  summary?: string | null
}

export default function ReportsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [comparison, setComparison] = useState<CompareReport[] | null>(null)

  const reportsQuery = useQuery({
    queryKey: ['reports', search, favorites, page],
    queryFn: async () => {
      const { data } = await api.get<{ reports: Report[]; pagination: Pagination }>('/reports', {
        params: { search: search || undefined, favorites: favorites || undefined, page, limit: 10 },
      })
      return data
    },
  })

  const favoriteMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/reports/${id}/favorite`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/reports/${id}`),
    onSuccess: () => {
      toast.success('Report deleted')
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })

  const compareMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await api.post<{ reports: CompareReport[] }>('/reports/compare', { reportIds: ids })
      return data.reports
    },
    onSuccess: setComparison,
  })

  const toggleSelected = (event: ChangeEvent<HTMLInputElement>, id: string) => {
    setSelected((current) => {
      if (event.target.checked) return [...current, id].slice(-2)
      return current.filter((item) => item !== id)
    })
  }

  const reports = reportsQuery.data?.reports ?? []
  const pagination = reportsQuery.data?.pagination

  return (
    <div className="page-shell">
      <div className="section-heading page-title">
        <div><h1>Reports</h1><p>Search, favorite, export, compare, and manage your SEO audit history.</p></div>
        <Button disabled={selected.length !== 2 || compareMutation.isPending} onClick={() => compareMutation.mutate(selected)} variant="secondary">
          <GitCompare size={17} /> Compare selected
        </Button>
      </div>

      <Card className="toolbar">
        <Input onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search URL, domain, or summary" value={search} />
        <Button onClick={() => { setFavorites((value) => !value); setPage(1) }} variant={favorites ? 'primary' : 'secondary'}>
          <Star size={17} /> Favorites
        </Button>
      </Card>

      <Card>
        {reportsQuery.isLoading ? <Spinner /> : reports.length ? (
          <div className="report-list">
            {reports.map((report) => (
              <div className="report-row" key={report.id}>
                <input checked={selected.includes(report.id)} onChange={(event) => toggleSelected(event, report.id)} type="checkbox" />
                <ScoreRing label="SEO" score={report.seoScore} size={72} />
                <div className="report-row__main">
                  <Link to={`/app/reports/${report.id}`}>{report.domain}</Link>
                  <p>{report.summary ?? report.url}</p>
                  <small>{formatDate(report.createdAt)} · {report.statusMessage ?? report.status}</small>
                </div>
                <Badge tone={report.status === 'COMPLETED' ? 'good' : report.status === 'FAILED' ? 'danger' : 'warning'}>{report.status}</Badge>
                <div className="row-actions">
                  <Button onClick={() => favoriteMutation.mutate(report.id)} size="sm" variant={report.favorite ? 'primary' : 'ghost'}>
                    <Star size={16} />
                  </Button>
                  <Link className="icon-link" to={`/app/reports/${report.id}`}><Eye size={16} /></Link>
                  <a className="icon-link" href={`${apiBaseUrl}/reports/${report.id}/export/pdf`}><Download size={16} /> PDF</a>
                  <a className="icon-link" href={`${apiBaseUrl}/reports/${report.id}/export/excel`}>XLSX</a>
                  <a className="icon-link" href={`${apiBaseUrl}/reports/${report.id}/export/json`}>JSON</a>
                  <Button onClick={() => window.confirm('Delete this report?') && deleteMutation.mutate(report.id)} size="sm" variant="danger">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState description="Run a new website analysis to create your first report." title="No reports found" />
        )}
      </Card>

      {pagination ? (
        <div className="pagination">
          <Button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} variant="secondary">Previous</Button>
          <span>Page {pagination.page} of {pagination.pages || 1}</span>
          <Button disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)} variant="secondary">Next</Button>
        </div>
      ) : null}

      <Modal onClose={() => setComparison(null)} open={Boolean(comparison)} title="Report comparison">
        <div className="compare-grid">
          {(comparison ?? []).map((report) => (
            <Card key={report.id}>
              <h3>{report.domain}</h3>
              <p>{report.summary}</p>
              <div className="score-grid mini">
                <ScoreRing label="SEO" score={report.scores.seo} size={78} />
                <ScoreRing label="Perf" score={report.scores.performance} size={78} />
                <ScoreRing label="Health" score={report.scores.health} size={78} />
              </div>
            </Card>
          ))}
        </div>
      </Modal>
    </div>
  )
}
