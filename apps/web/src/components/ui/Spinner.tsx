import { cn } from '@/lib/utils';

type SpinnerProps = {
  className?: string;
  label?: string;
};

export const Spinner = ({ className, label = 'Loading' }: SpinnerProps) => (
  <span className="inline-flex items-center gap-2" role="status" aria-label={label}>
    <span
      className={cn(
        'size-4 animate-spin rounded-full border-2 border-[rgb(var(--primary)/0.22)] border-t-[rgb(var(--primary))]',
        className,
      )}
    />
    <span className="sr-only">{label}</span>
  </span>
);
