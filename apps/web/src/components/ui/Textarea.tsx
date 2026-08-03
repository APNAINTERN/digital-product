import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-32 w-full resize-y rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.5)] px-4 py-3 text-sm text-[rgb(var(--foreground))] shadow-sm outline-none transition placeholder:text-[rgb(var(--muted-foreground))] focus:border-[rgb(var(--primary))] focus:ring-4 focus:ring-[rgb(var(--primary)/0.14)] disabled:cursor-not-allowed disabled:opacity-60',
      className,
    )}
    {...props}
  />
));

Textarea.displayName = 'Textarea';
