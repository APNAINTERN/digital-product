import type { ReactNode } from 'react'
import { Card, DataBadge } from '../ui'
import type { DataConfidence } from '../../types'

export function MetricCard({
  label,
  value,
  helper,
  icon,
  confidence,
}: {
  label: string
  value: ReactNode
  helper?: ReactNode
  icon?: ReactNode
  confidence?: DataConfidence | string
}) {
  return (
    <Card className="metric-card">
      <div className="metric-card__top">
        <span>{label}</span>
        {icon ? <span className="metric-card__icon">{icon}</span> : null}
      </div>
      <strong>{value}</strong>
      <div className="metric-card__footer">
        {helper ? <small>{helper}</small> : <span />}
        {confidence ? <DataBadge confidence={confidence} /> : null}
      </div>
    </Card>
  )
}
