import { CheckCircle2, XCircle } from 'lucide-react'
import { Badge, DataBadge } from '../ui'
import type { DataConfidence } from '../../types'

export function ChecklistItem({
  label,
  passed,
  detail,
  confidence,
}: {
  label: string
  passed: boolean
  detail?: string
  confidence?: DataConfidence | string
}) {
  return (
    <div className="checklist-item">
      {passed ? <CheckCircle2 className="text-good" size={20} /> : <XCircle className="text-danger" size={20} />}
      <div>
        <strong>{label}</strong>
        {detail ? <p>{detail}</p> : null}
      </div>
      <div className="checklist-item__meta">
        <Badge tone={passed ? 'good' : 'danger'}>{passed ? 'Pass' : 'Fix'}</Badge>
        {confidence ? <DataBadge confidence={confidence} /> : null}
      </div>
    </div>
  )
}
