import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Tile } from '../../components/Tile.js';

type Me = {
  first_name: string;
  status: string;
  flags: { engagement_tier: string; engagement_score: number; risk_score: number; orientation_complete_flag: boolean } | null;
  program: { name: string; passing_grade: number; attendance_threshold: number } | null;
  campus: { name: string; city: string } | null;
  coordinator: { first_name: string; last_name: string; email: string } | null;
  rep: { first_name: string; last_name: string; email: string } | null;
};

type Tasks = { items: Array<{ id: string; title: string; priority: string; due_at?: string }> };

export function StudentDashboard(): JSX.Element {
  const me = useQuery({ queryKey: ['student-me'], queryFn: () => api<Me>('/api/v1/student/me') });
  const tasks = useQuery({ queryKey: ['student-tasks'], queryFn: () => api<Tasks>('/api/v1/student/tasks') });

  if (me.isLoading || !me.data) {
    return <div className="h-64 bg-surface rounded-lg animate-pulse" />;
  }
  const m = me.data;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hi {m.first_name} 👋</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {m.program?.name} · {m.campus?.name}
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Status" value={m.status} />
        <Tile
          label="Engagement"
          value={m.flags?.engagement_tier ?? '—'}
          tone={m.flags?.engagement_tier === 'high' ? 'success' : m.flags?.engagement_tier === 'low' ? 'warn' : 'default'}
        />
        <Tile label="Engagement score" value={m.flags?.engagement_score ?? 0} />
        <Tile label="Onboarding" value={m.flags?.orientation_complete_flag ? '✅ Done' : 'In progress'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-zinc-800 rounded-lg p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Your support team</div>
          {m.coordinator && (
            <div className="text-sm">
              <span className="text-zinc-400">Coordinator:</span> {m.coordinator.first_name} {m.coordinator.last_name}
              <div className="text-xs text-zinc-500">{m.coordinator.email}</div>
            </div>
          )}
          {m.rep && (
            <div className="text-sm mt-3">
              <span className="text-zinc-400">Student services rep:</span> {m.rep.first_name} {m.rep.last_name}
              <div className="text-xs text-zinc-500">{m.rep.email}</div>
            </div>
          )}
        </div>
        <div className="bg-surface border border-zinc-800 rounded-lg p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Things to do</div>
          {tasks.data?.items.length === 0 && (
            <div className="text-sm text-zinc-500">You're all caught up. Nice work.</div>
          )}
          <ul className="space-y-2">
            {tasks.data?.items.map((t) => (
              <li key={t.id} className="text-sm">
                <span
                  className={`text-xs px-2 py-0.5 rounded mr-2 ${
                    t.priority === 'urgent' ? 'bg-danger/20 text-danger' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {t.priority}
                </span>
                {t.title}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
