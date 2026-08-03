import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../../lib/api'
import { formatNumber } from '../../lib/utils'
import { Card, Spinner } from '../../components/ui'
import type { AdminStats } from '../../types'

export default function AdminDashboardPage() {
  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await api.get<AdminStats>('/admin/stats')
      return data
    },
  })

  const stats = statsQuery.data
  const plans = Object.entries(stats?.plansBreakdown ?? {}).map(([label, value]) => ({ label, value }))
  const statuses = Object.entries(stats?.reportsByStatus ?? {}).map(([label, value]) => ({ label, value }))

  return (
    <div className="page-shell">
      <div className="page-title"><h1>Admin dashboard</h1><p>Platform-wide SEO Vision AI activity and operational health.</p></div>
      {statsQuery.isLoading ? <Spinner /> : (
        <>
          <div className="metric-grid">
            <Card><span>Users</span><strong className="big-number">{formatNumber(stats?.usersCount)}</strong></Card>
            <Card><span>Reports</span><strong className="big-number">{formatNumber(stats?.reportsCount)}</strong></Card>
            <Card><span>API requests</span><strong className="big-number">{formatNumber(stats?.apiUsage.requests)}</strong></Card>
            <Card><span>Open messages</span><strong className="big-number">{formatNumber(stats?.openMessagesCount)}</strong></Card>
          </div>
          <div className="two-column">
            <Card className="chart-card"><h2>Plans</h2><ResponsiveContainer height={260} width="100%"><BarChart data={plans}><CartesianGrid stroke="rgba(148,163,184,.12)" /><XAxis dataKey="label" tick={{ fill: '#94a3b8' }} /><YAxis tick={{ fill: '#94a3b8' }} /><Tooltip contentStyle={{ background: '#071725', border: '1px solid rgba(34,211,238,.25)' }} /><Bar dataKey="value" fill="#22d3ee" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></Card>
            <Card className="chart-card"><h2>Reports by status</h2><ResponsiveContainer height={260} width="100%"><BarChart data={statuses}><CartesianGrid stroke="rgba(148,163,184,.12)" /><XAxis dataKey="label" tick={{ fill: '#94a3b8' }} /><YAxis tick={{ fill: '#94a3b8' }} /><Tooltip contentStyle={{ background: '#071725', border: '1px solid rgba(34,211,238,.25)' }} /><Bar dataKey="value" fill="#14b8a6" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></Card>
          </div>
        </>
      )}
    </div>
  )
}
