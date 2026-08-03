import { Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge, Button, Card } from '../ui'

export type FixSuggestionData = {
  title?: string
  current?: string
  suggested?: string
  copyText?: string
  severity?: 'high' | 'medium' | 'low' | string
  description?: string
}

export function FixSuggestion({ fix }: { fix: FixSuggestionData }) {
  const copyValue = fix.copyText ?? fix.suggested ?? ''
  const copy = async () => {
    await navigator.clipboard.writeText(copyValue)
    toast.success('Suggestion copied')
  }

  return (
    <Card className="fix-card">
      <div className="fix-card__header">
        <div>
          <Badge tone={fix.severity === 'high' ? 'danger' : fix.severity === 'medium' ? 'warning' : 'info'}>
            {fix.severity ?? 'suggestion'}
          </Badge>
          <h3>{fix.title ?? 'SEO fix suggestion'}</h3>
        </div>
        <Button disabled={!copyValue} onClick={copy} size="sm" type="button" variant="secondary">
          <Copy size={15} /> Copy
        </Button>
      </div>
      {fix.description ? <p>{fix.description}</p> : null}
      <div className="fix-card__grid">
        <div>
          <span>Current</span>
          <p>{fix.current || 'Not available'}</p>
        </div>
        <div>
          <span>Suggested</span>
          <p>{fix.suggested || copyValue || 'No suggested copy provided.'}</p>
        </div>
      </div>
    </Card>
  )
}
