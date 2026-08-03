import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { Confidence } from '@/types';

const tooltipText: Record<Confidence, string> = {
  VERIFIED: 'Observed directly from the crawled website or connected source.',
  ESTIMATED: 'Modeled by SEO Vision AI heuristics for planning and benchmarking.',
  AI_GENERATED: 'Strategic guidance generated from verified and estimated inputs.',
};

const labelText: Record<Confidence, string> = {
  VERIFIED: 'Verified',
  ESTIMATED: 'Estimated',
  AI_GENERATED: 'AI generated',
};

type DataBadgeProps = {
  confidence?: Confidence | string;
  className?: string;
};

const normalizeConfidence = (value?: Confidence | string): Confidence => {
  if (value === 'VERIFIED' || value === 'AI_GENERATED' || value === 'ESTIMATED') {
    return value;
  }
  return 'ESTIMATED';
};

export const DataBadge = ({ confidence = 'ESTIMATED', className }: DataBadgeProps) => {
  const normalized = normalizeConfidence(confidence);

  return (
    <span className={cn('group relative inline-flex', className)}>
      <Badge confidence={normalized} className="gap-1.5">
        <Info className="size-3" />
        {labelText[normalized]}
      </Badge>
      <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.6rem)] z-20 w-64 -translate-x-1/2 rounded-xl border border-[rgb(var(--border))] bg-slate-950 px-3 py-2 text-xs leading-relaxed text-slate-100 opacity-0 shadow-2xl transition group-hover:opacity-100 group-focus-within:opacity-100">
        {tooltipText[normalized]}
      </span>
    </span>
  );
};
