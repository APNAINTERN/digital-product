import { cn } from '@/lib/utils';

type ProgressProps = {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  label?: string;
};

export const Progress = ({ value, max = 100, className, barClassName, label }: ProgressProps) => {
  const percentage = Math.max(0, Math.min(100, Math.round((value / max) * 100)));

  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <div className="flex items-center justify-between text-xs font-medium text-[rgb(var(--muted-foreground))]">
          <span>{label}</span>
          <span>{percentage}%</span>
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-[rgb(var(--foreground)/0.08)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-300 transition-all duration-500',
            barClassName,
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
