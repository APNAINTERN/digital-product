import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { DataConfidence } from '../../types'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ className, variant = 'primary', size = 'md', ...props }: ButtonProps) {
  return <button className={cn('sv-button', `sv-button--${variant}`, `sv-button--${size}`, className)} {...props} />
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('sv-card', className)}>{children}</div>
}

export function Badge({
  className,
  children,
  tone = 'neutral',
}: {
  className?: string
  children: ReactNode
  tone?: 'neutral' | 'good' | 'warning' | 'danger' | 'info'
}) {
  return <span className={cn('sv-badge', `sv-badge--${tone}`, className)}>{children}</span>
}

export function DataBadge({ confidence = 'ESTIMATED' }: { confidence?: DataConfidence | string }) {
  const tone = confidence === 'VERIFIED' ? 'good' : confidence === 'AI_GENERATED' ? 'info' : 'warning'
  return <Badge tone={tone}>{confidence.replace('_', ' ')}</Badge>
}

export function ScoreRing({
  score,
  label,
  size = 118,
}: {
  score?: number | null
  label?: string
  size?: number
}) {
  const normalized = Math.max(0, Math.min(100, Math.round(score ?? 0)))
  const angle = `${normalized * 3.6}deg`
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <div className="score-ring__track" style={{ background: `conic-gradient(var(--cyan) ${angle}, rgba(148, 163, 184, 0.16) 0deg)` }}>
        <div className="score-ring__inner">
          <strong>{score ?? '—'}</strong>
          {label ? <span>{label}</span> : null}
        </div>
      </div>
    </div>
  )
}

export function Progress({ value, className }: { value?: number | null; className?: string }) {
  const normalized = Math.max(0, Math.min(100, Math.round(value ?? 0)))
  return (
    <div className={cn('sv-progress', className)} aria-valuenow={normalized} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${normalized}%` }} />
    </div>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span className="sv-spinner-wrap">
      <span className="sv-spinner" />
      <span>{label}</span>
    </span>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('sv-input', className)} {...props} />
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          className={cn('tabs__tab', active === tab.id && 'is-active')}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({
  children,
  open,
  title,
  onClose,
}: {
  children: ReactNode
  open: boolean
  title: string
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="presentation">
      <div aria-modal="true" className="modal" role="dialog">
        <div className="modal__header">
          <h2>{title}</h2>
          <Button aria-label="Close modal" onClick={onClose} size="sm" variant="ghost">
            <X size={16} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
