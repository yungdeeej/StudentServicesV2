import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn.js';

export function Card({
  className,
  interactive,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }): JSX.Element {
  return (
    <div
      {...rest}
      className={cn(
        'bg-surface border border-border rounded-xl',
        interactive && 'hover:border-border-strong transition-colors cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('px-5 py-4 border-b border-border flex items-start justify-between gap-3', className)}>
      <div>
        <div className="font-medium text-ink">{title}</div>
        {subtitle && <div className="text-xs text-muted mt-0.5">{subtitle}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardBody({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div {...rest} className={cn('p-5', className)}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className={cn('px-5 py-3 border-t border-border bg-bg/40 rounded-b-xl', className)}>
      {children}
    </div>
  );
}
