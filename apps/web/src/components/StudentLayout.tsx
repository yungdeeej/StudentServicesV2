import type { ReactNode } from 'react';
import { auth } from '../lib/auth.js';

const NAV: Array<{ id: string; label: string; group?: string }> = [
  { id: 's-dashboard', label: 'Home', group: 'You' },
  { id: 's-grades', label: 'Grades', group: 'Academics' },
  { id: 's-attendance', label: 'Attendance', group: 'Academics' },
  { id: 's-courses', label: 'Courses', group: 'Academics' },
  { id: 's-transcripts', label: 'Transcripts', group: 'Academics' },
  { id: 's-messages', label: 'Messages', group: 'Support' },
  { id: 's-appointments', label: 'Appointments', group: 'Support' },
  { id: 's-wellness', label: 'Wellness check-in', group: 'Support' },
  { id: 's-tutoring', label: 'Tutoring', group: 'Support' },
  { id: 's-documents', label: 'My documents', group: 'Support' },
  { id: 's-study-groups', label: 'Study groups', group: 'Community' },
  { id: 's-bookings', label: 'Book a room', group: 'Community' },
  { id: 's-resources', label: 'Resources', group: 'Community' },
];

const GROUP_ORDER = ['You', 'Academics', 'Support', 'Community'] as const;

export function StudentLayout({
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
      <aside className="w-72 border-r border-zinc-800 p-6 flex flex-col gap-6 overflow-y-auto">
        <div>
          <div className="text-lg font-semibold">MCG Student Portal</div>
          <div className="text-xs text-zinc-500">Welcome, {user?.first_name}</div>
        </div>
        {GROUP_ORDER.map((group) => (
          <div key={group}>
            <div className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">{group}</div>
            <nav className="flex flex-col gap-1">
              {NAV.filter((n) => n.group === group).map((item) => (
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
          </div>
        ))}
        <div className="mt-auto text-xs text-zinc-500">
          <button onClick={onLogout} className="text-accent hover:underline">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-8 overflow-auto pb-24">{children}</main>
    </div>
  );
}
