import { AlertTriangle } from 'lucide-react'
import { Card, DataBadge } from '../ui'

export function ConfidenceBanner({ disclaimer }: { disclaimer?: string | null }) {
  return (
    <Card className="confidence-banner">
      <AlertTriangle size={22} />
      <div>
        <div className="inline-cluster">
          <strong>Confidence and methodology</strong>
          <DataBadge confidence="VERIFIED" />
          <DataBadge confidence="ESTIMATED" />
          <DataBadge confidence="AI_GENERATED" />
        </div>
        <p>
          {disclaimer ??
            'Verified data is observed during the crawl. Estimated and AI-generated insights are directional and should be validated with analytics, Search Console, and business data.'}
        </p>
      </div>
    </Card>
  )
}
