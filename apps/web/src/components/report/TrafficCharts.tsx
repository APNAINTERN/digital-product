import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DataBadge } from '../ui'
import type { TrafficEstimate } from '../../types'

const colors = ['#22d3ee', '#14b8a6', '#818cf8', '#f59e0b', '#fb7185', '#a78bfa']

export function TrafficCharts({ traffic }: { traffic?: TrafficEstimate | null }) {
  const monthly = traffic?.trends?.monthlyVisitors ?? []
  const devices = traffic?.devices?.chart ?? []
  const countries = traffic?.geography?.topCountries ?? []

  return (
    <div className="traffic-charts">
      <div className="chart-card chart-card--wide">
        <div className="chart-card__header">
          <h3>Monthly visitors trend</h3>
          <DataBadge confidence="ESTIMATED" />
        </div>
        <ResponsiveContainer height={260} width="100%">
          <LineChart data={monthly}>
            <CartesianGrid stroke="rgba(148,163,184,.12)" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#071725', border: '1px solid rgba(34,211,238,.25)' }} />
            <Line dataKey="value" dot={false} stroke="#22d3ee" strokeWidth={3} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-card">
        <div className="chart-card__header">
          <h3>Devices</h3>
          <DataBadge confidence="ESTIMATED" />
        </div>
        <ResponsiveContainer height={260} width="100%">
          <PieChart>
            <Pie data={devices} dataKey="value" innerRadius={54} nameKey="label" outerRadius={88} paddingAngle={3}>
              {devices.map((entry, index) => (
                <Cell fill={colors[index % colors.length]} key={entry.label} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#071725', border: '1px solid rgba(34,211,238,.25)' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-card">
        <div className="chart-card__header">
          <h3>Countries</h3>
          <DataBadge confidence="ESTIMATED" />
        </div>
        <ResponsiveContainer height={260} width="100%">
          <BarChart data={countries}>
            <CartesianGrid stroke="rgba(148,163,184,.12)" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#071725', border: '1px solid rgba(34,211,238,.25)' }} />
            <Bar dataKey="value" fill="#14b8a6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
