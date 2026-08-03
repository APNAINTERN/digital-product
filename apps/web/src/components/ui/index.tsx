export { Button } from './Button';
export { Input } from './Input';
export { Label } from './Label';
export { Textarea } from './Textarea';
export { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';
export { Badge } from './Badge';
export type { BadgeProps } from './Badge';
export { Progress } from './Progress';
export { Spinner } from './Spinner';
export { ScoreRing } from './ScoreRing';
export { Modal } from './Modal';
export { EmptyState } from './EmptyState';
export { DataBadge } from './DataBadge';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ControlledTabsProps = {
  tabs?: Array<{ id: string; label: string }>;
  items?: Array<{ value: string; label: string; content?: ReactNode }>;
  active?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  className?: string;
  children?: ReactNode;
};

export function Tabs({
  tabs,
  items,
  active,
  defaultValue,
  onChange,
  className,
  children,
}: ControlledTabsProps) {
  const source =
    tabs?.map((tab) => ({ value: tab.id, label: tab.label })) ??
    items?.map((item) => ({ value: item.value, label: item.label })) ??
    [];
  const [internal, setInternal] = useState(defaultValue ?? source[0]?.value ?? '');
  const current = active ?? internal;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="tabs" role="tablist">
        {source.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            className={cn('tabs__tab', current === item.value && 'is-active')}
            onClick={() => {
              setInternal(item.value);
              onChange?.(item.value);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
