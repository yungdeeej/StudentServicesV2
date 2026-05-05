import type { ReactNode } from 'react';
import { cn } from './cn.js';

type Tone = 'default' | 'success' | 'warn' | 'danger' | 'accent';

const TONE_VALUE: Record<Tone, string> = {
  default: 'text-ink',
  success: 'text-success',
  warn: 'text-warn',
  danger: 'text-danger',
  accent: 'text-accent',
};

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
  icon,
  trend,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  trend?: { dir: 'up' | 'down'; pct: number };
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('bg-surface border border-border rounded-xl p-5 flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-widest text-muted">{label}</div>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <div className={cn('text-3xl font-semibold leading-none', TONE_VALUE[tone])}>{value}</div>
      {(hint || trend) && (
        <div className="text-xs text-muted flex items-center gap-2">
          {trend && (
            <span className={cn('inline-flex items-center gap-1', trend.dir === 'up' ? 'text-success' : 'text-danger')}>
              {trend.dir === 'up' ? '↑' : '↓'} {Math.abs(trend.pct)}%
            </span>
          )}
          {hint}
        </div>
      )}
    </div>
  );
}
