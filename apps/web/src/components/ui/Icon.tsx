import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(props: IconProps): SVGProps<SVGSVGElement> & { width: number; height: number } {
  const { size = 18, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...rest,
  };
}

export const Icons = {
  home: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 11.5L12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" />
    </svg>
  ),
  users: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  alert: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  spark: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4" />
    </svg>
  ),
  message: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  heart: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
    </svg>
  ),
  shield: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  chart: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 3v18h18" />
      <path d="M7 14l3-3 3 3 5-6" />
    </svg>
  ),
  clipboard: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    </svg>
  ),
  graduation: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c3 2 9 2 12 0v-5" />
    </svg>
  ),
  calendar: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  folder: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  ),
  book: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
  group: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="9" cy="7" r="4" />
      <circle cx="17" cy="9" r="3" />
      <path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
      <path d="M22 21v-1a3 3 0 00-2-2.83" />
    </svg>
  ),
  pin: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  page: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  ),
  send: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  ),
  signOut: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
  bell: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  search: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  menu: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  ),
  close: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  check: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  plus: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  briefcase: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  ),
  upload: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M17 8l-5-5-5 5M12 3v12" />
    </svg>
  ),
  external: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <path d="M15 3h6v6M10 14L21 3" />
    </svg>
  ),
  arrowRight: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  ),
  sparkleHeart: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M19 14c1.5-1.5 3-3.5 3-5.5a3.5 3.5 0 00-7 0c0 2 1.5 4 3 5.5l1 1 1-1z" />
      <path d="M3 17l3-3 2 2 4-4 5 5" />
    </svg>
  ),
  trending: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M22 7l-9 9-4-4-7 7" />
      <path d="M16 7h6v6" />
    </svg>
  ),
};

export type IconName = keyof typeof Icons;

export function Icon({ name, ...rest }: { name: IconName } & IconProps): JSX.Element {
  const Cmp = Icons[name];
  return <Cmp {...rest} />;
}
