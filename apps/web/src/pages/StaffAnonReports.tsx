import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

type Report = {
  id: string;
  category: string;
  campus_id: string | null;
  body: string;
  status: string;
  contact_optional: string | null;
  notes: string | null;
  created_at: string;
};

export function StaffAnonReports(): JSX.Element {
  const qc = useQueryClient();
  const [active, setActive] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ['anon-reports'],
    queryFn: () => api<{ items: Report[] }>('/api/v1/anon-reports'),
  });

  const update = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      api(`/api/v1/anon-reports/${id}`, {
        method: 'POST',
        body: JSON.stringify({ status, notes }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['anon-reports'] }),
  });

  const activeReport = list.data?.items.find((r) => r.id === active);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Anonymous reports</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <ul className="md:col-span-1 bg-surface border border-zinc-800 rounded-lg overflow-hidden">
          {list.data?.items.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setActive(r.id)}
                className={`w-full text-left p-3 text-sm border-b border-zinc-800/60 hover:bg-zinc-800/40 ${
                  active === r.id ? 'bg-zinc-800/60' : ''
                }`}
              >
                <div className="text-xs uppercase tracking-wide text-zinc-500">{r.category}</div>
                <div className="font-medium truncate">{r.body.slice(0, 64)}…</div>
                <div className="text-xs text-zinc-500 mt-1">{r.status}</div>
              </button>
            </li>
          ))}
        </ul>
        <div className="md:col-span-2 bg-surface border border-zinc-800 rounded-lg p-4">
          {!activeReport && <div className="text-sm text-zinc-500">Select a report.</div>}
          {activeReport && (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-wide text-zinc-500">{activeReport.category}</div>
              <div className="text-sm whitespace-pre-wrap">{activeReport.body}</div>
              {activeReport.contact_optional && (
                <div className="text-xs text-zinc-400">Contact (optional): {activeReport.contact_optional}</div>
              )}
              <div className="flex gap-2 pt-2">
                {(['triaged', 'in_progress', 'resolved', 'closed_no_action'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => update.mutate({ id: activeReport.id, status: s })}
                    className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded"
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
