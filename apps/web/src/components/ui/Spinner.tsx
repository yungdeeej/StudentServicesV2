import { cn } from './cn.js';

export function Spinner({ size = 16, className }: { size?: number; className?: string }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-block border-2 border-current border-t-transparent rounded-full animate-spin',
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}

export function Skeleton({ className }: { className?: string }): JSX.Element {
  return <div className={cn('bg-surface-2 rounded-lg animate-pulse', className)} />;
}
