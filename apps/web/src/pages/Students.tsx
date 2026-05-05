import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  flags: { at_risk_flag: boolean; engagement_tier: string; risk_score: number; engagement_score: number } | null;
};

type ListResp = { items: Student[]; total: number };

export function Students(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => api<ListResp>('/api/v1/students?page_size=100'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Students</h1>
      {isLoading || !data ? (
        <div className="h-64 bg-surface border border-zinc-800 rounded-lg animate-pulse" />
      ) : (
        <div className="overflow-x-auto bg-surface border border-zinc-800 rounded-lg">
          <table className="w-full text-sm">
            <thead className="text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Risk</th>
                <th className="text-left px-4 py-3">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((s) => (
                <tr key={s.id} className="border-b border-zinc-800/60">
                  <td className="px-4 py-3">
                    {s.first_name} {s.last_name}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{s.email}</td>
                  <td className="px-4 py-3">
                    <Pill status={s.status} />
                  </td>
                  <td className="px-4 py-3">
                    {s.flags?.at_risk_flag ? (
                      <span className="text-danger">⚠ {s.flags.risk_score}</span>
                    ) : (
                      <span className="text-zinc-500">{s.flags?.risk_score ?? 0}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {s.flags?.engagement_tier} ({s.flags?.engagement_score ?? 0})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Pill({ status }: { status: string }): JSX.Element {
  const tone =
    status === 'at_risk'
      ? 'bg-danger/15 text-danger'
      : status === 'withdrawn'
        ? 'bg-zinc-700/30 text-zinc-400'
        : status === 'graduated'
          ? 'bg-success/15 text-success'
          : 'bg-accent/10 text-accent';
  return <span className={`text-xs px-2 py-0.5 rounded ${tone}`}>{status}</span>;
}
