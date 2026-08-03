import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { DataBadge } from '../ui'
import { formatNumber } from '../../lib/utils'

export type ComparisonMetric = {
  metric?: string
  primary?: number
  competitorAverage?: number
  gap?: number
  unit?: string
  confidence?: string
}

export function ComparisonTable({ rows }: { rows: ComparisonMetric[] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Your site</th>
            <th>Competitor avg.</th>
            <th>Gap</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const gap = row.gap ?? 0
            return (
              <tr key={row.metric}>
                <td>{row.metric}</td>
                <td>{formatNumber(row.primary)}</td>
                <td>{formatNumber(row.competitorAverage)}</td>
                <td className={gap >= 0 ? 'text-good' : 'text-danger'}>
                  <span className="inline-cluster">
                    {gap >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {formatNumber(Math.abs(gap))} {row.unit}
                  </span>
                </td>
                <td>
                  <DataBadge confidence={row.confidence ?? 'ESTIMATED'} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
