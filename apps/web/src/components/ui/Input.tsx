import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-11 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.5)] px-4 text-sm text-[rgb(var(--foreground))] shadow-sm outline-none transition placeholder:text-[rgb(var(--muted-foreground))] focus:border-[rgb(var(--primary))] focus:ring-4 focus:ring-[rgb(var(--primary)/0.14)] disabled:cursor-not-allowed disabled:opacity-60',
      className,
    )}
    {...props}
  />
));

Input.displayName = 'Input';
