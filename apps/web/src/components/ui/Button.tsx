import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn.js';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-600 active:bg-accent-700 disabled:bg-accent/40',
  secondary:
    'bg-surface-2 text-ink border border-border hover:bg-surface-3 hover:border-border-strong disabled:opacity-50',
  ghost: 'text-zinc-300 hover:bg-surface-2 hover:text-ink disabled:opacity-50',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25 border border-danger/30 disabled:opacity-50',
  soft: 'bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 disabled:opacity-50',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-5 text-base gap-2 rounded-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
}): JSX.Element {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors select-none',
        'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:cursor-not-allowed',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
    >
      {loading && (
        <span className="w-4 h-4 mr-2 inline-block border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {!loading && leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
}
