import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { Confidence } from '@/types';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none tracking-[-0.01em]',
  {
    variants: {
      variant: {
        default:
          'border-[rgb(var(--border))] bg-[rgb(var(--card)/0.48)] text-[rgb(var(--foreground))]',
        teal: 'border-teal-400/30 bg-teal-400/10 text-teal-300',
        amber: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
        green: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
        red: 'border-red-400/30 bg-red-400/10 text-red-300',
        slate: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const confidenceVariant: Record<Confidence, VariantProps<typeof badgeVariants>['variant']> = {
  VERIFIED: 'green',
  ESTIMATED: 'amber',
  AI_GENERATED: 'teal',
};

type Tone = 'neutral' | 'good' | 'warning' | 'danger' | 'info';

const toneVariant: Record<Tone, VariantProps<typeof badgeVariants>['variant']> = {
  neutral: 'default',
  good: 'green',
  warning: 'amber',
  danger: 'red',
  info: 'teal',
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
    confidence?: Confidence;
    tone?: Tone;
  };

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, confidence, tone, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        badgeVariants({
          variant: confidence
            ? confidenceVariant[confidence]
            : tone
              ? toneVariant[tone]
              : variant,
        }),
        className,
      )}
      {...props}
    />
  ),
);

Badge.displayName = 'Badge';
