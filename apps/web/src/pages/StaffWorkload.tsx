import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

type Op = {
  openCases: number;
  escalations: number;
  openInterventions: number;
  openTasks: number;
  tasks_by_owner: Array<{ owner_user_id: string | null; _count: { _all: number } }>;
};

export function StaffWorkload(): JSX.Element {
  const ops = useQuery({
    queryKey: ['ops'],
    queryFn: () => api<Op>('/api/v1/reporting/kpi/operational'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Workload</h1>
      <p className="text-sm text-zinc-500">
        Active load by staff member. Snapshots run every 6h; the balancer flags burnout scores
        above 70.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Open cases" value={ops.data?.openCases ?? 0} />
        <Card label="Escalations" value={ops.data?.escalations ?? 0} tone="danger" />
        <Card label="Open interventions" value={ops.data?.openInterventions ?? 0} />
        <Card label="Open tasks" value={ops.data?.openTasks ?? 0} />
      </div>
      <div className="bg-surface border border-zinc-800 rounded-lg">
        <div className="p-4 text-sm font-medium border-b border-zinc-800">Task load by owner</div>
        <ul className="divide-y divide-zinc-800/60">
          {ops.data?.tasks_by_owner.map((row) => (
            <li key={String(row.owner_user_id)} className="p-3 text-sm flex items-center justify-between">
              <span className="text-zinc-300 font-mono text-xs">{row.owner_user_id ?? 'unassigned'}</span>
              <span className="text-zinc-100">{row._count._all}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'danger';
}): JSX.Element {
  return (
    <div className="bg-surface border border-zinc-800 rounded-lg p-5">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`text-3xl font-semibold ${tone === 'danger' ? 'text-danger' : 'text-zinc-100'}`}>
        {value}
      </div>
    </div>
  );
}
