import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

type Checkin = {
  id: string;
  phq2_total: number;
  stress_score: number;
  risk_tier: string;
  ai_flagged: boolean;
  occurred_at: string;
  free_text: string | null;
  student: { id: string; first_name: string; last_name: string };
};

export function StaffWellnessQueue(): JSX.Element {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['wellness-queue'],
    queryFn: () => api<{ items: Checkin[] }>('/api/v1/wellness/queue'),
  });
  const triage = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: string }) =>
      api(`/api/v1/wellness/checkins/${id}/triage`, {
        method: 'POST',
        body: JSON.stringify({ outcome }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wellness-queue'] }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Wellness triage queue</h1>
      <p className="text-sm text-zinc-500">
        Check-ins flagged high or crisis tier. Crisis-tier check-ins automatically open a
        confidential case and message thread.
      </p>
      <div className="space-y-3">
        {list.data?.items.length === 0 && (
          <div className="bg-surface border border-zinc-800 rounded-lg p-12 text-center">
            <div className="text-3xl">✨</div>
            <div className="text-lg mt-2">Queue is clear</div>
          </div>
        )}
        {list.data?.items.map((c) => (
          <div
            key={c.id}
            className={`bg-surface border rounded-lg p-4 ${
              c.risk_tier === 'crisis' ? 'border-danger' : 'border-warn/40'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">
                  {c.student.first_name} {c.student.last_name}
                </div>
                <div className="text-xs text-zinc-500">
                  PHQ-2 {c.phq2_total}/6 · stress {c.stress_score}/10 · {c.risk_tier}
                  {c.ai_flagged && <span className="ml-2 text-danger">⚠ crisis phrase</span>}
                </div>
                {c.free_text && (
                  <div className="text-sm text-zinc-300 mt-2 whitespace-pre-wrap">
                    "{c.free_text}"
                  </div>
                )}
              </div>
              <div className="text-xs text-zinc-500">
                {new Date(c.occurred_at).toLocaleString()}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {(['contacted', 'no_response', 'escalated', 'resolved'] as const).map((o) => (
                <button
                  key={o}
                  onClick={() => triage.mutate({ id: c.id, outcome: o })}
                  className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded"
                >
                  {o.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
