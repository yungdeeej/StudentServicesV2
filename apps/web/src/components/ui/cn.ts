// Tiny className combiner. Avoids pulling clsx/tailwind-merge.
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
