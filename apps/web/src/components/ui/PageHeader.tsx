import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-widest text-muted mb-1.5">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-semibold text-ink leading-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted mt-1.5 max-w-2xl">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
