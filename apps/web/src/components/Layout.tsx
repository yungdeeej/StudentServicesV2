import { useState, type ReactNode } from 'react';
import { auth } from '../lib/auth.js';
import { Avatar } from './ui/Avatar.js';
import { Icon, type IconName } from './ui/Icon.js';
import { cn } from './ui/cn.js';

type NavItem = { id: string; label: string; icon: IconName; group: 'main' | 'support' | 'system' };

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', group: 'main' },
  { id: 'students', label: 'Students', icon: 'users', group: 'main' },
  { id: 'at-risk', label: 'At-Risk', icon: 'alert', group: 'main' },
  { id: 'engagement', label: 'Engagement', icon: 'spark', group: 'main' },
  { id: 'messaging', label: 'Messages', icon: 'message', group: 'support' },
  { id: 'wellness-queue', label: 'Wellness', icon: 'heart', group: 'support' },
  { id: 'anon-reports', label: 'Anonymous', icon: 'shield', group: 'support' },
  { id: 'workload', label: 'Workload', icon: 'briefcase', group: 'system' },
  { id: 'reporting', label: 'Reporting', icon: 'chart', group: 'system' },
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-bg text-ink">
      {drawerOpen && (
        <button
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
        />
      )}
      <Sidebar
        active={active}
        onNavigate={(id) => {
          onNavigate(id);
          setDrawerOpen(false);
        }}
        open={drawerOpen}
        onLogout={onLogout}
        user={user}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuToggle={() => setDrawerOpen(true)} active={active} user={user} />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  active,
  onNavigate,
  open,
  onLogout,
  user,
}: {
  active: string;
  onNavigate: (id: string) => void;
  open: boolean;
  onLogout: () => void;
  user: { first_name: string; last_name: string; role: string } | null;
}): JSX.Element {
  return (
    <aside
      className={cn(
        'bg-surface border-r border-border flex flex-col z-40',
        'fixed md:static top-0 bottom-0 left-0 w-64 transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}
    >
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-400 to-violet-500 grid place-items-center font-bold text-white">
            M
          </div>
          <div>
            <div className="font-semibold leading-none">MCG Portal</div>
            <div className="text-[11px] text-muted mt-1">Staff workspace</div>
          </div>
        </div>
      </div>
      <nav className="px-3 py-2 space-y-5 flex-1 overflow-y-auto">
        <NavGroup label="Workspace" items={NAV.filter((n) => n.group === 'main')} active={active} onNavigate={onNavigate} />
        <NavGroup label="Student support" items={NAV.filter((n) => n.group === 'support')} active={active} onNavigate={onNavigate} />
        <NavGroup label="Operations" items={NAV.filter((n) => n.group === 'system')} active={active} onNavigate={onNavigate} />
      </nav>
      {user && (
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={`${user.first_name} ${user.last_name}`} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted">{user.role}</div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-md hover:bg-surface-2 text-muted hover:text-ink transition"
              title="Sign out"
              aria-label="Sign out"
            >
              <Icon name="signOut" size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function NavGroup({
  label,
  items,
  active,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  active: string;
  onNavigate: (id: string) => void;
}): JSX.Element {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted px-3 mb-2">{label}</div>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative',
                isActive ? 'bg-accent/15 text-accent' : 'text-zinc-300 hover:bg-surface-2 hover:text-ink',
              )}
            >
              {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-accent" />}
              <Icon name={item.icon} size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TopBar({
  onMenuToggle,
  active,
  user,
}: {
  onMenuToggle: () => void;
  active: string;
  user: { first_name: string; last_name: string; role: string } | null;
}): JSX.Element {
  const current = NAV.find((n) => n.id === active);
  return (
    <header className="sticky top-0 z-20 glass border-b border-border h-14 px-4 md:px-8 flex items-center gap-3">
      <button
        type="button"
        onClick={onMenuToggle}
        className="md:hidden p-2 rounded-md hover:bg-surface-2"
        aria-label="Open menu"
      >
        <Icon name="menu" size={18} />
      </button>
      <div className="flex items-center gap-2 text-sm min-w-0">
        <span className="text-muted">Workspace</span>
        <span className="text-muted">/</span>
        <span className="font-medium truncate">{current?.label ?? '—'}</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button className="p-2 rounded-md hover:bg-surface-2 text-muted hover:text-ink relative" aria-label="Notifications">
          <Icon name="bell" size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent animate-pulseDot" />
        </button>
        {user && (
          <div className="hidden md:flex items-center gap-2 pl-2">
            <Avatar name={`${user.first_name} ${user.last_name}`} size="sm" />
          </div>
        )}
      </div>
    </header>
  );
}
