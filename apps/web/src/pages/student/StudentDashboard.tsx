import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.js';
import { Stat } from '../../components/ui/Stat.js';
import { Skeleton } from '../../components/ui/Spinner.js';
import { Badge, StatusBadge } from '../../components/ui/Badge.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { Icon, type IconName } from '../../components/ui/Icon.js';
import { Button } from '../../components/ui/Button.js';

type Me = {
  first_name: string;
  status: string;
  flags: {
    engagement_tier: string;
    engagement_score: number;
    risk_score: number;
    orientation_complete_flag: boolean;
  } | null;
  program: { name: string; passing_grade: number; attendance_threshold: number } | null;
  campus: { name: string; city: string } | null;
  coordinator: { first_name: string; last_name: string; email: string } | null;
  rep: { first_name: string; last_name: string; email: string } | null;
};

type Tasks = {
  items: Array<{ id: string; title: string; priority: string; due_at?: string | null }>;
};

type Attendance = { summary: { total: number; present: number; pct: number } };

const QUICK_ACTIONS: Array<{ id: string; label: string; icon: IconName; tone: string }> = [
  { id: 's-wellness', label: 'Wellness check-in', icon: 'heart', tone: 'rose' },
  { id: 's-messages', label: 'Message my team', icon: 'message', tone: 'sky' },
  { id: 's-appointments', label: 'Book a meeting', icon: 'calendar', tone: 'violet' },
  { id: 's-tutoring', label: 'Request tutoring', icon: 'sparkleHeart', tone: 'amber' },
  { id: 's-bookings', label: 'Book a room', icon: 'pin', tone: 'emerald' },
  { id: 's-resources', label: 'Browse resources', icon: 'spark', tone: 'cyan' },
];

const TONE_CLASS: Record<string, string> = {
  rose: 'bg-rose-500/15 text-rose-400',
  sky: 'bg-sky-500/15 text-sky-400',
  violet: 'bg-violet-500/15 text-violet-400',
  amber: 'bg-amber-500/15 text-amber-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  cyan: 'bg-cyan-500/15 text-cyan-400',
};

export function StudentDashboard({
  onNavigate,
}: { onNavigate?: (id: string) => void } = {}): JSX.Element {
  const me = useQuery({ queryKey: ['student-me'], queryFn: () => api<Me>('/api/v1/student/me') });
  const tasks = useQuery({ queryKey: ['student-tasks'], queryFn: () => api<Tasks>('/api/v1/student/tasks') });
  const attendance = useQuery({
    queryKey: ['student-attendance-summary'],
    queryFn: () => api<Attendance>('/api/v1/student/attendance'),
  });

  if (me.isLoading || !me.data) return <DashboardSkeleton />;
  const m = me.data;
  const tier = m.flags?.engagement_tier ?? 'low';
  const greeting = greetingFor();

  return (
    <div className="space-y-6">
      <Card className="gradient-hero p-6 md:p-8 border-border-strong">
        <div className="flex items-start gap-4">
          <Avatar name={m.first_name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted">{greeting}</div>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">Hi {m.first_name} 👋</h1>
            <div className="text-sm text-muted mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1"><Icon name="graduation" size={14} /> {m.program?.name ?? '—'}</span>
              <span className="text-zinc-700">·</span>
              <span className="inline-flex items-center gap-1"><Icon name="pin" size={14} /> {m.campus?.name ?? '—'}</span>
              <span className="text-zinc-700">·</span>
              <StatusBadge status={m.status} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Stat
          label="Engagement"
          value={m.flags?.engagement_score ?? 0}
          hint={
            <Badge tone={tier === 'high' ? 'success' : tier === 'medium' ? 'warn' : 'danger'}>
              {tier} tier
            </Badge>
          }
          icon={<Icon name="spark" size={16} />}
        />
        <Stat
          label="Attendance (90d)"
          value={attendance.data ? `${attendance.data.summary.pct}%` : '—'}
          tone={attendance.data && attendance.data.summary.pct >= 80 ? 'success' : 'warn'}
          icon={<Icon name="check" size={16} />}
          hint={
            attendance.data
              ? `${attendance.data.summary.present}/${attendance.data.summary.total} sessions`
              : undefined
          }
        />
        <Stat
          label="Onboarding"
          value={m.flags?.orientation_complete_flag ? 'Complete' : 'In progress'}
          tone={m.flags?.orientation_complete_flag ? 'success' : 'warn'}
          icon={<Icon name="clipboard" size={16} />}
        />
        <Stat
          label="Open tasks"
          value={tasks.data?.items.length ?? 0}
          tone={(tasks.data?.items.length ?? 0) > 3 ? 'warn' : 'default'}
          icon={<Icon name="bell" size={16} />}
        />
      </div>

      <div>
        <SectionHeader title="Quick actions" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.id}
              type="button"
              onClick={() => onNavigate?.(qa.id)}
              className="group bg-surface border border-border hover:border-border-strong rounded-xl p-4 text-left transition flex flex-col gap-3"
            >
              <span className={`w-10 h-10 rounded-lg grid place-items-center ${TONE_CLASS[qa.tone]}`}>
                <Icon name={qa.icon} size={18} />
              </span>
              <div className="text-sm font-medium leading-tight">{qa.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          <SectionHeader title="What's on your plate" />
          <Card>
            {tasks.data?.items.length === 0 ? (
              <div className="p-8 text-center">
                <div className="inline-flex w-12 h-12 mb-3 rounded-full bg-success/15 text-success items-center justify-center">
                  <Icon name="check" size={20} />
                </div>
                <div className="text-base font-medium">All caught up</div>
                <div className="text-sm text-muted mt-1">No open tasks. Nice work!</div>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {tasks.data?.items.map((t) => (
                  <li key={t.id} className="p-4 flex items-start gap-3">
                    <span
                      className={
                        t.priority === 'urgent' || t.priority === 'high'
                          ? 'mt-1.5 w-2 h-2 rounded-full bg-danger animate-pulseDot shrink-0'
                          : 'mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0'
                      }
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{t.title}</div>
                      {t.due_at && (
                        <div className="text-xs text-muted mt-0.5">
                          Due {new Date(t.due_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <Badge tone={t.priority === 'urgent' ? 'danger' : t.priority === 'high' ? 'warn' : 'neutral'}>
                      {t.priority}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-3">
          <SectionHeader title="Your support team" />
          <Card className="p-5 space-y-4">
            {m.coordinator && (
              <PersonRow
                name={`${m.coordinator.first_name} ${m.coordinator.last_name}`}
                role="Coordinator"
                email={m.coordinator.email}
              />
            )}
            {m.rep && (
              <PersonRow
                name={`${m.rep.first_name} ${m.rep.last_name}`}
                role="Student services"
                email={m.rep.email}
              />
            )}
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              leftIcon={<Icon name="message" size={14} />}
              onClick={() => onNavigate?.('s-messages')}
            >
              Send a message
            </Button>
          </Card>
          <Card className="p-5 border-danger/30">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-danger/15 text-danger grid place-items-center shrink-0">
                <Icon name="heart" size={18} />
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium">Need to talk?</div>
                <div className="text-xs text-muted mt-1">
                  Crisis resources are available 24/7. Wellness check-ins are private.
                </div>
                <Button
                  variant="soft"
                  size="sm"
                  className="mt-3"
                  rightIcon={<Icon name="arrowRight" size={14} />}
                  onClick={() => onNavigate?.('s-wellness')}
                >
                  Open wellness
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PersonRow({ name, role, email }: { name: string; role: string; email: string }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="text-[11px] uppercase tracking-widest text-muted">{role}</div>
        <a className="text-xs text-accent hover:underline truncate block" href={`mailto:${email}`}>
          {email}
        </a>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }): JSX.Element {
  return <div className="text-[11px] uppercase tracking-widest text-muted mb-2">{title}</div>;
}

function greetingFor(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function DashboardSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}
