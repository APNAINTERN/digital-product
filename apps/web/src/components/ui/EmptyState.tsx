import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export const EmptyState = ({ title, description, icon, action, className }: EmptyStateProps) => (
  <div
    className={cn(
      'grid place-items-center rounded-3xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card)/0.28)] px-6 py-12 text-center',
      className,
    )}
  >
    <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]">
      {icon ?? <Search className="size-5" />}
    </div>
    <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
    {description ? <p className="mt-2 max-w-md text-sm text-[rgb(var(--muted-foreground))]">{description}</p> : null}
    {action ? <div className="mt-6">{action}</div> : null}
  </div>
);
