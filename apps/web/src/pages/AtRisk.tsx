import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

type AtRiskStudent = {
  id: string;
  first_name: string;
  last_name: string;
  flags: { risk_score: number };
  program: { name: string } | null;
  campus: { name: string } | null;
};

export function AtRisk(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['at-risk'],
    queryFn: () => api<{ items: AtRiskStudent[] }>('/api/v1/risk/at-risk'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">At-Risk Students</h1>
      {isLoading || !data ? (
        <div className="h-64 bg-surface border border-zinc-800 rounded-lg animate-pulse" />
      ) : data.items.length === 0 ? (
        <div className="bg-surface border border-zinc-800 rounded-lg p-12 text-center">
          <div className="text-4xl">🎉</div>
          <div className="text-lg mt-2">No at-risk students this week</div>
          <div className="text-sm text-zinc-500">Keep it up.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((s) => (
            <div key={s.id} className="bg-surface border border-zinc-800 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">
                    {s.first_name} {s.last_name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {s.campus?.name} · {s.program?.name}
                  </div>
                </div>
                <div className="text-danger font-semibold">{s.flags.risk_score}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
