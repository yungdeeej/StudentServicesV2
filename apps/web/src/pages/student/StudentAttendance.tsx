import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.js';
import { Stat } from '../../components/ui/Stat.js';
import { Skeleton } from '../../components/ui/Spinner.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Icon } from '../../components/ui/Icon.js';

type Att = {
  items: Array<{ id: string; session_id: string; occurred_at: string; present: boolean; source: string }>;
  summary: { total: number; present: number; pct: number };
};

export function StudentAttendance(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['student-attendance'],
    queryFn: () => api<Att>('/api/v1/student/attendance'),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Attendance" description="Last 90 days from your live classes." />

      {isLoading || !data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <Stat
              label="Last 90 days"
              value={`${data.summary.pct}%`}
              tone={data.summary.pct >= 80 ? 'success' : data.summary.pct >= 65 ? 'warn' : 'danger'}
              icon={<Icon name="check" size={16} />}
            />
            <Stat label="Sessions" value={data.summary.total} />
            <Stat label="Present" value={data.summary.present} tone="success" />
          </div>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-muted bg-bg/40 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Session</th>
                  <th className="text-left px-4 py-3 font-medium">Source</th>
                  <th className="text-left px-4 py-3 font-medium">When</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/40">
                    <td className="px-4 py-3 font-mono text-xs">{a.session_id}</td>
                    <td className="px-4 py-3 text-zinc-400">{a.source}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(a.occurred_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {a.present ? (
                        <span className="text-success inline-flex items-center gap-1">
                          <Icon name="check" size={12} /> Present
                        </span>
                      ) : (
                        <span className="text-danger inline-flex items-center gap-1">
                          <Icon name="close" size={12} /> Absent
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
