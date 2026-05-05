import type { ReactNode } from 'react';
import { cn } from './cn.js';

type Tone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger' | 'info';

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-zinc-300 border-border',
  accent: 'bg-accent/10 text-accent border-accent/30',
  success: 'bg-success/10 text-success border-success/30',
  warn: 'bg-warn/10 text-warn border-warn/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
  info: 'bg-info/10 text-info border-info/30',
};

export function Badge({
  tone = 'neutral',
  dot,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border',
        TONE[tone],
        className,
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulseDot" />}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  start: 'info',
  stay: 'accent',
  at_risk: 'danger',
  withdrawn: 'neutral',
  on_practicum: 'info',
  graduated: 'success',
  re_entry: 'warn',
  alumni: 'neutral',
  open: 'info',
  in_progress: 'accent',
  resolved: 'success',
  closed: 'neutral',
  escalated: 'danger',
  high: 'success',
  medium: 'warn',
  low: 'danger',
  confirmed: 'success',
  requested: 'info',
  cancelled: 'neutral',
  completed: 'success',
  no_show: 'danger',
  approved: 'success',
  rejected: 'danger',
  uploaded: 'info',
  under_review: 'warn',
  none: 'neutral',
  moderate: 'warn',
  crisis: 'danger',
};

export function StatusBadge({ status }: { status: string }): JSX.Element {
  const tone = STATUS_TONE[status] ?? 'neutral';
  return (
    <Badge tone={tone}>{status.replace(/_/g, ' ')}</Badge>
  );
}
