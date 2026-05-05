import type { ReactNode } from 'react';

export function Tile({
  label,
  value,
  hint,
  tone,
  children,
}: {
  label: string;
  value?: ReactNode;
  hint?: string;
  tone?: 'default' | 'success' | 'warn' | 'danger';
  children?: ReactNode;
}): JSX.Element {
  const accent =
    tone === 'success'
      ? 'text-success'
      : tone === 'warn'
        ? 'text-warn'
        : tone === 'danger'
          ? 'text-danger'
          : 'text-zinc-100';
  return (
    <div className="bg-surface border border-zinc-800 rounded-lg p-5 flex flex-col gap-2">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      {value !== undefined && <div className={`text-3xl font-semibold ${accent}`}>{value}</div>}
      {hint && <div className="text-xs text-zinc-500">{hint}</div>}
      {children}
    </div>
  );
}
