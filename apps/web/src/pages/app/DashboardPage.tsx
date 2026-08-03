import { useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, BarChart3, Crown, Globe2, Sparkles, Zap } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { formatDate, formatNumber, normalizeUrlInput } from '../../lib/utils'
import { getArray, reportPayload, scoreFromReport } from '../../lib/reportData'
import { useAuthStore } from '../../stores/authStore'
import { Badge, Button, Card, DataBadge, EmptyState, Input, ScoreRing, Spinner } from '../../components/ui'
import type { Report, SavedWebsite } from '../../types'

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reportsQuery = useQuery({
    queryKey: ['dashboard-reports'],
    queryFn: async () => {
      const { data } = await api.get<{ reports: Report[] }>('/reports', { params: { limit: 8 } })
      return data.reports
    },
  })

  const websitesQuery = useQuery({
    queryKey: ['dashboard-websites'],
    queryFn: async () => {
      const { data } = await api.get<{ websites: SavedWebsite[] }>('/websites')
      return data.websites
    },
  })

  const latest = reportsQuery.data?.[0]
  const latestData = reportPayload(latest)
  const suggestions = [
    ...getArray<string>(latestData, ['ai.needsImprovement']),
    ...getArray<string>(latestData, ['seo.recommendations']),
  ].slice(0, 5)
  const sparkline = useMemo(
    () =>
      (reportsQuery.data ?? [])
        .slice()
        .reverse()
        .map((report) => ({
          label: formatDate(report.createdAt),
          seo: scoreFromReport(report, 'seo') ?? 0,
          performance: scoreFromReport(report, 'performance') ?? 0,
        })),
    [reportsQuery.data],
  )

  const analyze = async (event: FormEvent) => {
    event.preventDefault()
    if (!url.trim()) return
    setSubmitting(true)
    try {
      const { data } = await api.post<{ reportId: string }>('/analyze', { url: normalizeUrlInput(url) })
      toast.success('Analysis queued')
      navigate(`/app/analyze?id=${data.reportId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start analysis')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-shell">
      <motion.section {...fade} className="hero-grid">
        <Card className="welcome-card">
          <Badge tone="info">Authenticated workspace</Badge>
          <h1>Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p>Launch audits, track SEO health, and turn AI guidance into prioritized growth work.</p>
          <form className="analyzer-form" onSubmit={analyze}>
            <Input onChange={(event) => setUrl(event.target.value)} placeholder="https://yourdomain.com" value={url} />
            <Button disabled={submitting} type="submit">
              {submitting ? <Spinner label="Starting" /> : <><Zap size={18} /> Analyze</>}
            </Button>
          </form>
        </Card>
        <Card className="upgrade-card">
          <Crown size={28} />
          <h2>Unlock competitive intelligence</h2>
          <p>Upgrade for deeper report history, exports, and expanded AI action plans.</p>
          <Button onClick={() => navigate('/app/billing')} variant="secondary">View plans</Button>
        </Card>
      </motion.section>

      <motion.section {...fade} className="score-grid">
        <Card className="score-card">
          <ScoreRing label="SEO" score={scoreFromReport(latest, 'seo')} />
          <div><strong>SEO score</strong><p>{latest?.domain ?? 'No completed report yet'}</p></div>
        </Card>
        <Card className="score-card">
          <ScoreRing label="Perf" score={scoreFromReport(latest, 'performance')} />
          <div><strong>Performance</strong><p>Core Web Vitals overview</p></div>
        </Card>
        <Card className="score-card">
          <ScoreRing label="Health" score={scoreFromReport(latest, 'health')} />
          <div><strong>Site health</strong><p>Technical and security blend</p></div>
        </Card>
      </motion.section>

      <motion.section {...fade} className="dashboard-grid">
        <Card className="chart-card--wide">
          <div className="section-heading">
            <div><h2>Score movement</h2><p>Sparklines from recent completed and in-progress reports.</p></div>
            <DataBadge confidence="ESTIMATED" />
          </div>
          {sparkline.length > 1 ? (
            <ResponsiveContainer height={220} width="100%">
              <AreaChart data={sparkline}>
                <defs>
                  <linearGradient id="seoSpark" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ background: '#071725', border: '1px solid rgba(34,211,238,.25)' }} />
                <Area dataKey="seo" fill="url(#seoSpark)" stroke="#22d3ee" strokeWidth={3} type="monotone" />
                <Area dataKey="performance" fill="transparent" stroke="#14b8a6" strokeWidth={2} type="monotone" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState description="Run at least two analyses to see trend lines." title="No score history yet" />
          )}
        </Card>

        <Card>
          <div className="section-heading">
            <div><h2>AI suggestions</h2><p>Preview from the latest report.</p></div>
            <Sparkles size={20} />
          </div>
          {suggestions.length ? (
            <ul className="insight-list">
              {suggestions.map((item) => <li key={item}>{item}<DataBadge confidence="AI_GENERATED" /></li>)}
            </ul>
          ) : (
            <EmptyState description="AI recommendations appear after a completed audit." title="No suggestions yet" />
          )}
        </Card>

        <Card>
          <div className="section-heading">
            <div><h2>Recent reports</h2><p>{formatNumber(reportsQuery.data?.length)} visible reports</p></div>
            <Link to="/app/reports">View all</Link>
          </div>
          {reportsQuery.isLoading ? <Spinner /> : (
            <div className="compact-list">
              {(reportsQuery.data ?? []).slice(0, 5).map((report) => (
                <Link className="compact-row" key={report.id} to={`/app/reports/${report.id}`}>
                  <BarChart3 size={18} />
                  <span><strong>{report.domain}</strong><small>{formatDate(report.createdAt)}</small></span>
                  <Badge tone={report.status === 'COMPLETED' ? 'good' : report.status === 'FAILED' ? 'danger' : 'warning'}>{report.status}</Badge>
                </Link>
              ))}
              {!reportsQuery.data?.length ? <EmptyState title="No reports yet" /> : null}
            </div>
          )}
        </Card>

        <Card>
          <div className="section-heading">
            <div><h2>Saved websites</h2><p>Quick access targets.</p></div>
            <Link to="/app/websites">Manage</Link>
          </div>
          {websitesQuery.isLoading ? <Spinner /> : (
            <div className="compact-list">
              {(websitesQuery.data ?? []).slice(0, 6).map((website) => (
                <button className="compact-row" key={website.id} onClick={() => setUrl(website.url)} type="button">
                  <Globe2 size={18} />
                  <span><strong>{website.label ?? website.domain}</strong><small>{website.url}</small></span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
              {!websitesQuery.data?.length ? <EmptyState title="No saved websites" /> : null}
            </div>
          )}
        </Card>
      </motion.section>
    </div>
  )
}
