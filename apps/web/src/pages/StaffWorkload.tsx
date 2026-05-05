import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { Stat } from '../components/ui/Stat.js';
import { Card } from '../components/ui/Card.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Icon } from '../components/ui/Icon.js';

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
      <PageHeader
        title="Workload"
        description="Snapshots run every 6 hours. Burnout scores ≥ 70 surface as urgent manager tasks."
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Open cases" value={ops.data?.openCases ?? 0} icon={<Icon name="clipboard" size={16} />} />
        <Stat
          label="Escalations"
          value={ops.data?.escalations ?? 0}
          tone="danger"
          icon={<Icon name="alert" size={16} />}
        />
        <Stat
          label="Open interventions"
          value={ops.data?.openInterventions ?? 0}
          icon={<Icon name="spark" size={16} />}
        />
        <Stat label="Open tasks" value={ops.data?.openTasks ?? 0} icon={<Icon name="bell" size={16} />} />
      </div>
      <Card>
        <div className="px-5 py-4 border-b border-border text-sm font-medium">Task load by owner</div>
        <ul className="divide-y divide-border">
          {ops.data?.tasks_by_owner.map((row) => {
            const max = Math.max(1, ...(ops.data?.tasks_by_owner.map((r) => r._count._all) ?? [1]));
            const pct = (row._count._all / max) * 100;
            return (
              <li key={String(row.owner_user_id)} className="px-5 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300 font-mono text-xs truncate">
                    {row.owner_user_id ?? 'unassigned'}
                  </span>
                  <span className="text-ink font-medium">{row._count._all}</span>
                </div>
                <div className="mt-2 h-1.5 bg-surface-3 rounded">
                  <div
                    className="h-1.5 bg-accent rounded"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
