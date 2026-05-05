import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

type Req = {
  id: string;
  subject: string;
  topic: string | null;
  urgency: string;
  status: string;
  created_at: string;
  sessions: Array<{ id: string; scheduled_at: string; status: string }>;
};

export function StudentTutoring(): JSX.Element {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['tutoring-me'],
    queryFn: () => api<{ items: Req[] }>('/api/v1/tutoring/requests/me'),
  });
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'normal' | 'high'>('normal');
  const submit = useMutation({
    mutationFn: () =>
      api('/api/v1/tutoring/requests', {
        method: 'POST',
        body: JSON.stringify({ subject, topic: topic || undefined, urgency }),
      }),
    onSuccess: () => {
      setSubject('');
      setTopic('');
      void qc.invalidateQueries({ queryKey: ['tutoring-me'] });
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tutoring</h1>
      <p className="text-sm text-zinc-500">
        Need help with a class? Drop a request — we'll match you with a peer or staff tutor within
        2 business days.
      </p>
      <div className="bg-surface border border-zinc-800 rounded-lg p-4 grid sm:grid-cols-3 gap-3">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (e.g. Anatomy)"
          className="bg-bg border border-zinc-800 rounded px-3 py-2 text-sm"
        />
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Specific topic (optional)"
          className="bg-bg border border-zinc-800 rounded px-3 py-2 text-sm"
        />
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value as 'low' | 'normal' | 'high')}
          className="bg-bg border border-zinc-800 rounded px-3 py-2 text-sm"
        >
          <option value="low">Low urgency</option>
          <option value="normal">Normal</option>
          <option value="high">Urgent (test soon)</option>
        </select>
        <div className="sm:col-span-3">
          <button
            onClick={() => submit.mutate()}
            disabled={!subject || submit.isPending}
            className="bg-accent text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {submit.isPending ? 'Submitting…' : 'Request tutoring'}
          </button>
        </div>
      </div>
      <div className="bg-surface border border-zinc-800 rounded-lg">
        {list.data?.items.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500">No tutoring requests yet.</div>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {list.data?.items.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {r.subject} {r.topic && <span className="text-zinc-500">— {r.topic}</span>}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {r.status}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {r.urgency} urgency · {new Date(r.created_at).toLocaleDateString()}
                </div>
                {r.sessions.length > 0 && (
                  <ul className="mt-2 text-xs text-zinc-400">
                    {r.sessions.map((s) => (
                      <li key={s.id}>
                        Session {new Date(s.scheduled_at).toLocaleString()} ({s.status})
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
