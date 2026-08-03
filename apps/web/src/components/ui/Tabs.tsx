import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TabItem = {
  value: string;
  label: string;
  content: ReactNode;
};

type TabsProps = {
  items: TabItem[];
  defaultValue?: string;
  className?: string;
};

export const Tabs = ({ items, defaultValue, className }: TabsProps) => {
  const [activeValue, setActiveValue] = useState(defaultValue ?? items[0]?.value);
  const activeItem = items.find((item) => item.value === activeValue) ?? items[0];

  return (
    <div className={cn('space-y-4', className)}>
      <div className="inline-flex rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--foreground)/0.04)] p-1">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setActiveValue(item.value)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-semibold text-[rgb(var(--muted-foreground))] transition',
              activeValue === item.value &&
                'bg-[rgb(var(--card))] text-[rgb(var(--foreground))] shadow-sm shadow-black/10',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div>{activeItem?.content}</div>
    </div>
  );
};
