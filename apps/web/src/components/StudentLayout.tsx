import { useState, type ReactNode } from 'react';
import { auth } from '../lib/auth.js';
import { Avatar } from './ui/Avatar.js';
import { Icon, type IconName } from './ui/Icon.js';
import { cn } from './ui/cn.js';

type Group = 'You' | 'Academics' | 'Support' | 'Community';
type NavItem = { id: string; label: string; icon: IconName; group: Group; bottomNav?: boolean };

const NAV: NavItem[] = [
  { id: 's-dashboard', label: 'Home', icon: 'home', group: 'You', bottomNav: true },
  { id: 's-grades', label: 'Grades', icon: 'graduation', group: 'Academics' },
  { id: 's-attendance', label: 'Attendance', icon: 'check', group: 'Academics' },
  { id: 's-courses', label: 'Courses', icon: 'book', group: 'Academics' },
  { id: 's-transcripts', label: 'Transcripts', icon: 'page', group: 'Academics' },
  { id: 's-messages', label: 'Messages', icon: 'message', group: 'Support', bottomNav: true },
  { id: 's-appointments', label: 'Appointments', icon: 'calendar', group: 'Support' },
  { id: 's-wellness', label: 'Wellness check-in', icon: 'heart', group: 'Support', bottomNav: true },
  { id: 's-tutoring', label: 'Tutoring', icon: 'sparkleHeart', group: 'Support' },
  { id: 's-documents', label: 'My documents', icon: 'folder', group: 'Support' },
  { id: 's-study-groups', label: 'Study groups', icon: 'group', group: 'Community' },
  { id: 's-bookings', label: 'Book a room', icon: 'pin', group: 'Community' },
  { id: 's-resources', label: 'Resources', icon: 'spark', group: 'Community', bottomNav: true },
];

const GROUP_ORDER: Group[] = ['You', 'Academics', 'Support', 'Community'];

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
        user={user}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onMenuToggle={() => setDrawerOpen(true)}
          active={active}
          user={user}
          onWellnessQuickAccess={() => onNavigate('s-wellness')}
        />
        <main className="flex-1 overflow-auto pb-24 md:pb-8">
          <div className="max-w-5xl mx-auto p-6 md:p-8">{children}</div>
        </main>
        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-border h-16 grid grid-cols-4">
          {NAV.filter((n) => n.bottomNav).map((item) => {
            const isActive = active === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 text-[10px]',
                  isActive ? 'text-accent' : 'text-muted',
                )}
              >
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function Sidebar({
  active,
  onNavigate,
  open,
  user,
  onLogout,
}: {
  active: string;
  onNavigate: (id: string) => void;
  open: boolean;
  user: { first_name: string; last_name: string } | null;
  onLogout: () => void;
}): JSX.Element {
  return (
    <aside
      className={cn(
        'bg-surface border-r border-border flex flex-col z-40',
        'fixed md:static top-0 bottom-0 left-0 w-72 transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}
    >
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-400 to-emerald-400 grid place-items-center font-bold text-white">
            M
          </div>
          <div>
            <div className="font-semibold leading-none">MCG Student</div>
            <div className="text-[11px] text-muted mt-1">Hey {user?.first_name} 👋</div>
          </div>
        </div>
      </div>
      <nav className="px-3 py-2 space-y-5 flex-1 overflow-y-auto">
        {GROUP_ORDER.map((group) => (
          <div key={group}>
            <div className="text-[10px] uppercase tracking-widest text-muted px-3 mb-2">{group}</div>
            <div className="flex flex-col gap-0.5">
              {NAV.filter((n) => n.group === group).map((item) => {
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
        ))}
      </nav>
      {user && (
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={`${user.first_name} ${user.last_name}`} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted">Student</div>
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

function TopBar({
  onMenuToggle,
  active,
  user,
  onWellnessQuickAccess,
}: {
  onMenuToggle: () => void;
  active: string;
  user: { first_name: string; last_name: string } | null;
  onWellnessQuickAccess: () => void;
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
        <span className="font-medium truncate">{current?.label ?? 'MCG Student'}</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onWellnessQuickAccess}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20"
        >
          <Icon name="heart" size={14} />
          Need support?
        </button>
        <button className="p-2 rounded-md hover:bg-surface-2 text-muted hover:text-ink relative" aria-label="Notifications">
          <Icon name="bell" size={18} />
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
