import type { ReactNode } from 'react';
import { Card } from './Card.js';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <Card className="p-12 text-center">
      {icon && <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-surface-3 flex items-center justify-center text-zinc-300">{icon}</div>}
      <div className="text-base font-medium text-ink">{title}</div>
      {description && <div className="text-sm text-muted mt-2 max-w-md mx-auto">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
