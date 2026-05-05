import { cn } from './cn.js';

const COLORS = [
  'from-blue-500 to-violet-500',
  'from-emerald-500 to-cyan-500',
  'from-amber-500 to-pink-500',
  'from-pink-500 to-rose-500',
  'from-indigo-500 to-blue-500',
  'from-teal-500 to-emerald-500',
];

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}): JSX.Element {
  const initials = name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const dim = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-12 h-12 text-sm', xl: 'w-16 h-16 text-base' }[size];
  const color = COLORS[hash(name) % COLORS.length];
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-gradient-to-br text-white font-semibold tracking-wide shrink-0',
        color,
        dim,
        className,
      )}
      aria-hidden
    >
      {initials || '·'}
    </div>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
