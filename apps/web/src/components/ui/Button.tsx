import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-[-0.01em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--background))] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-lg shadow-teal-500/20 hover:brightness-110',
        secondary:
          'bg-[rgb(var(--secondary))] text-[rgb(var(--secondary-foreground))] shadow-lg shadow-amber-500/20 hover:brightness-105',
        ghost:
          'text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--foreground)/0.06)] hover:text-[rgb(var(--foreground))]',
        danger:
          'bg-[rgb(var(--danger))] text-[rgb(var(--danger-foreground))] shadow-lg shadow-red-500/20 hover:brightness-105',
        outline:
          'border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.36)] text-[rgb(var(--foreground))] hover:border-[rgb(var(--primary)/0.55)] hover:bg-[rgb(var(--primary)/0.08)]',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-7 text-base',
        icon: 'size-10 p-0',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    />
  ),
);

Button.displayName = 'Button';
