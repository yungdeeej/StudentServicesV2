import type { ReactNode } from 'react';
import { auth } from '../lib/auth.js';

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'students', label: 'Students' },
  { id: 'at-risk', label: 'At-Risk' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'reporting', label: 'Reporting' },
];

export function Layout({
  active,
  onNavigate,
  onLogout,
  children,
}: {
  active: string;
  onNavigate: (id: string) => void;
  onLogout: () => void;
  children: ReactNode;
}): JSX.Element {
  const user = auth.getUser();
  return (
    <div className="min-h-screen flex bg-bg text-zinc-100">
      <aside className="w-64 border-r border-zinc-800 p-6 flex flex-col gap-6">
        <div>
          <div className="text-lg font-semibold">MCG Student Services</div>
          <div className="text-xs text-zinc-500">Career College Portal</div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`text-left px-3 py-2 rounded-md text-sm transition ${
                active === item.id
                  ? 'bg-accent/20 text-accent'
                  : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto text-xs text-zinc-500">
          <div className="mb-2">
            {user?.first_name} {user?.last_name}
            <div className="text-[10px] uppercase tracking-wide text-zinc-600">{user?.role}</div>
          </div>
          <button onClick={onLogout} className="text-accent hover:underline">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
