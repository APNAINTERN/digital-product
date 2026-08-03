import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, ExternalLink, Image, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import api, { apiBaseUrl } from '../../lib/api'
import { asRecord, booleanLabel, getArray, getNumber, getString, reportPayload, scoreFromReport } from '../../lib/reportData'
import { formatDate, formatNumber } from '../../lib/utils'
import { ActionPlanTimeline } from '../../components/report/ActionPlanTimeline'
import { ChecklistItem } from '../../components/report/ChecklistItem'
import { ComparisonTable } from '../../components/report/ComparisonTable'
import { ConfidenceBanner } from '../../components/report/ConfidenceBanner'
import { FixSuggestion, type FixSuggestionData } from '../../components/report/FixSuggestion'
import { HeatmapGrid } from '../../components/report/HeatmapGrid'
import { MetricCard } from '../../components/report/MetricCard'
import { TrafficCharts } from '../../components/report/TrafficCharts'
import { Badge, Card, DataBadge, EmptyState, ScoreRing, Spinner, Tabs } from '../../components/ui'
import type { ChartPoint, Report, TrafficEstimate } from '../../types'

const tabItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'performance', label: 'Performance' },
  { id: 'technical', label: 'Technical' },
  { id: 'onpage', label: 'On-page' },
  { id: 'content', label: 'Content' },
  { id: 'images', label: 'Images' },
  { id: 'security', label: 'Security' },
  { id: 'business', label: 'Business' },
  { id: 'local', label: 'Local SEO' },
  { id: 'traffic', label: 'Traffic' },
  { id: 'keywords', label: 'Keywords' },
  { id: 'competitors', label: 'Competitors' },
  { id: 'backlinks', label: 'Backlinks' },
  { id: 'social', label: 'Social' },
  { id: 'advisor', label: 'AI Advisor' },
  { id: 'plan', label: '30/60/90' },
  { id: 'fixes', label: 'Fixes' },
]

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

const fieldValue = (source: unknown, key: string): string => {
  const field = asRecord(asRecord(source)[key])
  const value = field.value
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

const list = (items: unknown[], empty = 'No items found.') =>
  items.length ? <ul className="bullet-list">{items.map((item, index) => <li key={`${String(item)}-${index}`}>{String(item)}</li>)}</ul> : <p>{empty}</p>

export default function ReportDetailPage() {
  const { id } = useParams()
  const [active, setActive] = useState('overview')
  const reportQuery = useQuery({
    queryKey: ['report', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<{ report: Report }>(`/reports/${id}`)
      return data.report
    },
  })

  const report = reportQuery.data
  const data = useMemo(() => reportPayload(report), [report])
  const seo = asRecord(data.seo)
  const crawl = asRecord(data.crawl)
  const scores = asRecord(seo.scores)
  const cwv = asRecord(seo.coreWebVitals)
  const business = asRecord(data.business)
  const traffic = asRecord(data.traffic) as TrafficEstimate
  const localSeo = asRecord(data.localSeo)
  const competitors = asRecord(data.competitors)
  const backlinks = asRecord(data.backlinks)
  const social = asRecord(data.socialAnalysis)
  const keywords = asRecord(data.keywordAnalysis)
  const ai = asRecord(data.ai)

  const technicalChecks = [
    { label: 'Crawl returns successful status', passed: Boolean(crawl.success), detail: `HTTP ${String(crawl.statusCode ?? 'unknown')}` },
    { label: 'HTTPS enabled', passed: Boolean(crawl.isHttps), detail: String(crawl.finalUrl ?? report?.url ?? '') },
    { label: 'Robots.txt found', passed: Boolean(asRecord(crawl.robotsTxt).exists), detail: String(asRecord(crawl.robotsTxt).url ?? '') },
    { label: 'XML sitemap found', passed: Boolean(asRecord(crawl.sitemapXml).exists), detail: String(asRecord(crawl.sitemapXml).url ?? '') },
    { label: 'Canonical configured', passed: Boolean(asRecord(crawl.meta).canonical), detail: String(asRecord(crawl.meta).canonical ?? 'Missing canonical') },
    { label: 'Viewport meta present', passed: Boolean(asRecord(crawl.meta).viewport), detail: String(asRecord(crawl.meta).viewport ?? 'Missing viewport') },
    { label: 'Structured data detected', passed: getArray(data, ['crawl.schemaOrg']).length > 0, detail: `${getArray(data, ['crawl.schemaOrg']).length} JSON-LD blocks` },
  ]

  const aiSections = asRecord(ai.sections)
  const keywordRows = getArray<Record<string, unknown>>(keywords, ['rankingKeywords', 'keywords', 'items'])
  const issues = getArray<Record<string, unknown>>(seo, ['issues'])
  const competitorRows = getArray<Record<string, unknown>>(competitors, ['competitors'])
  const backlinkChart = getArray<ChartPoint>(backlinks, ['chart'])
  const socialFollowers = getArray<ChartPoint>(social, ['estimatedFollowers'])
  const metricGroups = asRecord(seo.metricGroups)

  if (reportQuery.isLoading) {
    return <div className="page-shell"><Spinner label="Loading report" /></div>
  }

  if (!report) {
    return <div className="page-shell"><EmptyState title="Report not found" action={<Link to="/app/reports">Back to reports</Link>} /></div>
  }

  return (
    <div className="page-shell report-detail">
      <div className="report-hero">
        <div>
          <Link to="/app/reports">← Back to reports</Link>
          <h1>{report.domain}</h1>
          <p>{report.summary ?? getString(data, ['summary', 'ai.executiveSummary'], 'Full SEO Vision AI audit report')}</p>
          <div className="inline-cluster">
            <Badge tone={report.status === 'COMPLETED' ? 'good' : report.status === 'FAILED' ? 'danger' : 'warning'}>{report.status}</Badge>
            <span>Generated {formatDate(report.completedAt ?? report.createdAt)}</span>
            <a href={report.url} rel="noreferrer" target="_blank"><ExternalLink size={15} /> Visit site</a>
          </div>
        </div>
        <div className="export-actions">
          {(['pdf', 'excel', 'json'] as const).map((format) => (
            <a className="sv-button sv-button--secondary sv-button--md" href={`${apiBaseUrl}/reports/${report.id}/export/${format}`} key={format}>
              <Download size={16} /> {format.toUpperCase()}
            </a>
          ))}
        </div>
      </div>

      <Tabs active={active} onChange={setActive} tabs={tabItems} />

      {active === 'overview' ? (
        <motion.section {...fade} className="report-section">
          <div className="score-grid">
            <Card className="score-card"><ScoreRing label="SEO" score={scoreFromReport(report, 'seo')} /><div><strong>SEO score</strong><p>Overall search readiness</p></div></Card>
            <Card className="score-card"><ScoreRing label="Perf" score={scoreFromReport(report, 'performance')} /><div><strong>Performance</strong><p>Core Web Vitals blend</p></div></Card>
            <Card className="score-card"><ScoreRing label="Health" score={scoreFromReport(report, 'health')} /><div><strong>Health</strong><p>Technical + security</p></div></Card>
          </div>
          <ConfidenceBanner disclaimer={getString(data, ['meta.disclaimer'])} />
          <div className="two-column">
            <Card><h2>Executive summary</h2><p>{getString(data, ['ai.executiveSummary', 'summary'], report.summary ?? 'No summary generated yet.')}</p><DataBadge confidence="AI_GENERATED" /></Card>
            <Card><h2>Strengths</h2>{list(getArray(seo, ['strengths']))}</Card>
          </div>
        </motion.section>
      ) : null}

      {active === 'performance' ? (
        <motion.section {...fade} className="report-section">
          <div className="metric-grid five">
            <MetricCard confidence={String(cwv.confidence ?? 'ESTIMATED')} helper="Largest Contentful Paint" label="LCP" value={`${formatNumber(getNumber(cwv, ['lcpMs']))} ms`} />
            <MetricCard confidence={String(cwv.confidence ?? 'ESTIMATED')} helper="Cumulative Layout Shift" label="CLS" value={getNumber(cwv, ['cls']).toFixed(3)} />
            <MetricCard confidence={String(cwv.confidence ?? 'ESTIMATED')} helper="First Contentful Paint" label="FCP" value={`${formatNumber(getNumber(cwv, ['fcpMs', 'firstContentfulPaintMs']))} ms`} />
            <MetricCard confidence={String(cwv.confidence ?? 'ESTIMATED')} helper="Interaction to Next Paint" label="INP" value={`${formatNumber(getNumber(cwv, ['inpMs']))} ms`} />
            <MetricCard confidence={String(cwv.confidence ?? 'ESTIMATED')} helper="Time to First Byte" label="TTFB" value={`${formatNumber(getNumber(cwv, ['ttfbMs']))} ms`} />
          </div>
          <Card><h2>Performance notes</h2>{list(getArray(cwv, ['notes']), 'No performance notes available.')}<DataBadge confidence={String(cwv.confidence ?? 'ESTIMATED')} /></Card>
        </motion.section>
      ) : null}

      {active === 'technical' ? (
        <motion.section {...fade} className="report-section">
          <div className="checklist">{technicalChecks.map((item) => <ChecklistItem confidence="VERIFIED" key={item.label} {...item} />)}</div>
          <Card><h2>Technical score groups</h2><pre className="json-lite">{JSON.stringify(asRecord(metricGroups.technical).metrics ?? {}, null, 2)}</pre></Card>
        </motion.section>
      ) : null}

      {active === 'onpage' ? (
        <motion.section {...fade} className="report-section">
          <div className="metric-grid">
            <MetricCard confidence="VERIFIED" label="Title" value={String(crawl.title ?? 'Missing')} />
            <MetricCard confidence="VERIFIED" label="Meta description" value={String(asRecord(crawl.meta).description ?? 'Missing')} />
            <MetricCard confidence="VERIFIED" label="H1 tags" value={formatNumber(getArray(crawl, ['headings.h1']).length)} />
            <MetricCard confidence="VERIFIED" label="Internal links" value={formatNumber(getArray(crawl, ['links.internal']).length)} />
          </div>
          <Card><h2>On-page recommendations</h2>{list(getArray(seo, ['recommendations']))}</Card>
        </motion.section>
      ) : null}

      {active === 'content' ? (
        <motion.section {...fade} className="report-section">
          <div className="metric-grid">
            <MetricCard confidence="VERIFIED" label="Word count" value={formatNumber(getNumber(crawl, ['wordCount']))} />
            <MetricCard confidence="ESTIMATED" label="Readability" value={getString(seo, ['readability.grade'], '—')} />
            <MetricCard confidence="ESTIMATED" label="Readability score" value={formatNumber(getNumber(seo, ['readability.score']))} />
            <MetricCard confidence="ESTIMATED" label="Spam risk" value={getString(seo, ['spam.risk'], '—')} />
          </div>
          <Card>
            <h2>Keyword density</h2>
            <div className="table-wrap"><table className="data-table"><thead><tr><th>Keyword</th><th>Count</th><th>Density</th><th>Confidence</th></tr></thead><tbody>
              {getArray<Record<string, unknown>>(seo, ['keywordDensity.metrics']).map((row) => <tr key={String(row.keyword)}><td>{String(row.keyword)}</td><td>{formatNumber(Number(row.count ?? 0))}</td><td>{String(row.density ?? '—')}%</td><td><DataBadge confidence="ESTIMATED" /></td></tr>)}
            </tbody></table></div>
          </Card>
        </motion.section>
      ) : null}

      {active === 'images' ? (
        <motion.section {...fade} className="report-section">
          <div className="metric-grid">
            <MetricCard confidence="VERIFIED" icon={<Image size={18} />} label="Images crawled" value={formatNumber(getArray(crawl, ['images']).length)} />
            <MetricCard confidence="VERIFIED" label="Missing alt text" value={formatNumber(getArray<Record<string, unknown>>(crawl, ['images']).filter((imageItem) => !imageItem.alt).length)} />
            <MetricCard confidence="VERIFIED" label="Lazy loaded" value={formatNumber(getArray<Record<string, unknown>>(crawl, ['images']).filter((imageItem) => imageItem.loading === 'lazy').length)} />
          </div>
          <Card><h2>Image score data</h2><pre className="json-lite">{JSON.stringify(asRecord(metricGroups.images).metrics ?? {}, null, 2)}</pre></Card>
        </motion.section>
      ) : null}

      {active === 'security' ? (
        <motion.section {...fade} className="report-section">
          <div className="metric-grid">
            <MetricCard confidence="VERIFIED" icon={<Lock size={18} />} label="HTTPS" value={booleanLabel(crawl.isHttps)} />
            <MetricCard confidence="VERIFIED" icon={<ShieldCheck size={18} />} label="Security score" value={formatNumber(Number(scores.security ?? 0))} />
            <MetricCard confidence="VERIFIED" label="HTTP resources" value={formatNumber(getNumber(asRecord(metricGroups.security), ['metrics.externalHttpResources']))} />
          </div>
          <Card><h2>Security signals</h2><pre className="json-lite">{JSON.stringify(asRecord(metricGroups.security).metrics ?? {}, null, 2)}</pre></Card>
        </motion.section>
      ) : null}

      {active === 'business' ? (
        <motion.section {...fade} className="report-section">
          <Card>
            <h2>Business information</h2>
            <dl className="definition-list">
              {['businessName', 'organization', 'category', 'industry', 'companyType', 'phone', 'email', 'description'].map((key) => (
                <div key={key}><dt>{key.replace(/([A-Z])/g, ' $1')}</dt><dd>{fieldValue(business, key)}</dd></div>
              ))}
              <div><dt>Address</dt><dd>{fieldValue(asRecord(business.address), 'formatted')}</dd></div>
            </dl>
          </Card>
          <Card><h2>Evidence</h2>{list(getArray(business, ['evidence']))}</Card>
        </motion.section>
      ) : null}

      {active === 'local' ? (
        <motion.section {...fade} className="report-section">
          <div className="metric-grid">
            <MetricCard confidence={String(localSeo.confidence ?? 'ESTIMATED')} label="NAP score" value={formatNumber(Number(localSeo.napConsistencyScore ?? 0))} />
            <MetricCard confidence={String(localSeo.confidence ?? 'ESTIMATED')} label="Review opportunity" value={String(localSeo.reviewOpportunity ?? '—')} />
          </div>
          <div className="checklist">
            <ChecklistItem confidence={String(localSeo.confidence ?? 'ESTIMATED')} label="Address present" passed={Boolean(localSeo.hasAddress)} />
            <ChecklistItem confidence={String(localSeo.confidence ?? 'ESTIMATED')} label="Phone present" passed={Boolean(localSeo.hasPhone)} />
            <ChecklistItem confidence={String(localSeo.confidence ?? 'ESTIMATED')} label="LocalBusiness schema" passed={Boolean(localSeo.hasLocalBusinessSchema)} />
          </div>
          <Card><h2>Google Business / Local SEO recommendations</h2>{list(getArray(localSeo, ['recommendations']))}</Card>
        </motion.section>
      ) : null}

      {active === 'traffic' ? (
        <motion.section {...fade} className="report-section">
          <div className="metric-grid">
            <MetricCard confidence="ESTIMATED" label="Monthly visitors" value={formatNumber(traffic.visitors?.monthly)} />
            <MetricCard confidence="ESTIMATED" label="Daily average" value={formatNumber(traffic.visitors?.dailyAverage)} />
            <MetricCard confidence="ESTIMATED" label="Returning users" value={`${formatNumber(traffic.visitors?.returningPercent)}%`} />
            <MetricCard confidence="ESTIMATED" label="Bounce rate" value={`${formatNumber(traffic.engagement?.bounceRate)}%`} />
          </div>
          <TrafficCharts traffic={traffic} />
          <HeatmapGrid peakDays={traffic.timing?.peakDays} peakHours={traffic.timing?.peakHours} />
        </motion.section>
      ) : null}

      {active === 'keywords' ? (
        <motion.section {...fade} className="report-section">
          <Card><h2>Keyword analysis <DataBadge confidence="ESTIMATED" /></h2>
            <div className="table-wrap"><table className="data-table"><thead><tr><th>Keyword</th><th>Position</th><th>Volume</th><th>Difficulty</th><th>Intent</th></tr></thead><tbody>
              {keywordRows.map((row) => <tr key={String(row.keyword)}><td>{String(row.keyword)}</td><td>{formatNumber(Number(row.estimatedPosition ?? row.position ?? 0))}</td><td>{formatNumber(Number(row.estimatedMonthlyVolume ?? row.volume ?? 0))}</td><td>{formatNumber(Number(row.difficulty ?? 0))}</td><td>{String(row.intent ?? '—')}</td></tr>)}
            </tbody></table></div>
          </Card>
          <div className="two-column"><Card><h2>Primary topics</h2>{list(getArray(keywords, ['primaryTopics']))}</Card><Card><h2>Content gaps</h2>{list(getArray(keywords, ['contentGaps']))}</Card></div>
        </motion.section>
      ) : null}

      {active === 'competitors' ? (
        <motion.section {...fade} className="report-section">
          <div className="competitor-grid">
            {competitorRows.map((competitor) => <Card key={String(competitor.website)}><h3>{String(competitor.name)}</h3><a href={String(competitor.website)} rel="noreferrer" target="_blank">{String(competitor.website)}</a><div className="metric-pills"><Badge tone="info">DA {String(competitor.domainAuthority)}</Badge><Badge tone="warning">{formatNumber(Number(competitor.monthlyTraffic ?? 0))} visits</Badge></div><h4>Strengths</h4>{list(Array.isArray(competitor.strengths) ? competitor.strengths : [])}<h4>Weaknesses</h4>{list(Array.isArray(competitor.weaknesses) ? competitor.weaknesses : [])}<DataBadge confidence="ESTIMATED" /></Card>)}
          </div>
          <Card><h2>Comparison table</h2><ComparisonTable rows={getArray(competitors, ['comparison'])} /></Card>
        </motion.section>
      ) : null}

      {active === 'backlinks' ? (
        <motion.section {...fade} className="report-section">
          <div className="metric-grid">
            <MetricCard confidence="ESTIMATED" label="Estimated backlinks" value={formatNumber(Number(backlinks.estimatedBacklinks ?? 0))} />
            <MetricCard confidence="ESTIMATED" label="Referring domains" value={formatNumber(Number(backlinks.referringDomains ?? 0))} />
            <MetricCard confidence="ESTIMATED" label="Domain authority" value={formatNumber(Number(backlinks.domainAuthority ?? 0))} />
            <MetricCard confidence="ESTIMATED" label="Toxic risk" value={String(backlinks.toxicBacklinkRisk ?? '—')} />
          </div>
          <Card className="chart-card"><h2>Backlink mix <DataBadge confidence="ESTIMATED" /></h2><ResponsiveContainer height={260} width="100%"><BarChart data={backlinkChart}><CartesianGrid stroke="rgba(148,163,184,.12)" /><XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} /><YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} /><Tooltip contentStyle={{ background: '#071725', border: '1px solid rgba(34,211,238,.25)' }} /><Bar dataKey="value" fill="#22d3ee" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></Card>
        </motion.section>
      ) : null}

      {active === 'social' ? (
        <motion.section {...fade} className="report-section">
          <div className="metric-grid">
            <MetricCard confidence={String(social.confidence ?? 'ESTIMATED')} label="Connected platforms" value={formatNumber(Number(social.connectedPlatforms ?? 0))} />
          </div>
          <Card className="chart-card"><h2>Estimated followers <DataBadge confidence="ESTIMATED" /></h2><ResponsiveContainer height={260} width="100%"><BarChart data={socialFollowers}><CartesianGrid stroke="rgba(148,163,184,.12)" /><XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} /><YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} /><Tooltip contentStyle={{ background: '#071725', border: '1px solid rgba(34,211,238,.25)' }} /><Bar dataKey="value" fill="#14b8a6" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></Card>
          <Card><h2>Social recommendations</h2>{list(getArray(social, ['recommendations']))}</Card>
        </motion.section>
      ) : null}

      {active === 'advisor' ? (
        <motion.section {...fade} className="report-section">
          <Card className="advisor-card"><Sparkles size={24} /><h2>AI Business Growth Advisor <DataBadge confidence="AI_GENERATED" /></h2><p>{String(ai.executiveSummary ?? report.summary ?? 'No advisor narrative available.')}</p><div className="metric-grid"><MetricCard confidence="AI_GENERATED" label="Status" value={String(ai.status ?? '—')} /><MetricCard confidence="AI_GENERATED" label="Growth potential" value={String(ai.growthPotential ?? '—')} /><MetricCard confidence="AI_GENERATED" label="Timeline" value={String(ai.estimatedTimeline ?? '—')} /></div></Card>
          <div className="advisor-sections">
            {Object.entries(aiSections).map(([key, value]) => {
              const section = asRecord(value)
              const bullets = Array.isArray(value) ? value : getArray(section, ['bullets'])
              return <Card key={key}><h3>{String(section.title ?? key.replace(/([A-Z])/g, ' $1'))}</h3>{section.summary ? <p>{String(section.summary)}</p> : null}{list(bullets)}<DataBadge confidence="AI_GENERATED" /></Card>
            })}
          </div>
        </motion.section>
      ) : null}

      {active === 'plan' ? (
        <motion.section {...fade} className="report-section">
          <ActionPlanTimeline phases={getArray(ai, ['actionPlan'])} />
        </motion.section>
      ) : null}

      {active === 'fixes' ? (
        <motion.section {...fade} className="report-section">
          <div className="fix-grid">
            {issues.map((issue) => {
              const fix = asRecord(issue.fix)
              return <FixSuggestion fix={{ ...fix, severity: String(issue.severity ?? 'medium'), description: String(issue.description ?? '') } as FixSuggestionData} key={String(issue.id ?? issue.title)} />
            })}
            {!issues.length ? <EmptyState title="No SEO fixes found" /> : null}
          </div>
        </motion.section>
      ) : null}
    </div>
  )
}
