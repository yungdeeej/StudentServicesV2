import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

type Req = {
  id: string;
  recipient_name: string;
  recipient_email: string;
  status: string;
  requested_at: string;
};

export function StudentTranscripts(): JSX.Element {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['my-transcripts'],
    queryFn: () => api<{ items: Req[] }>('/api/v1/transcripts/me'),
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const submit = useMutation({
    mutationFn: () =>
      api('/api/v1/transcripts/me', {
        method: 'POST',
        body: JSON.stringify({ recipient_name: name, recipient_email: email, notes }),
      }),
    onSuccess: () => {
      setName('');
      setEmail('');
      setNotes('');
      void qc.invalidateQueries({ queryKey: ['my-transcripts'] });
    },
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">Transcript requests</h1>
      <p className="text-sm text-zinc-500">
        Request an official transcript or program-completion verification. We'll email you a release
        form to sign, then deliver to the recipient within 5 business days.
      </p>
      <div className="bg-surface border border-zinc-800 rounded-lg p-4 space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Recipient name (e.g. employer or institution)"
          className="w-full bg-bg border border-zinc-800 rounded px-3 py-2 text-sm"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Recipient email"
          className="w-full bg-bg border border-zinc-800 rounded px-3 py-2 text-sm"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={3}
          className="w-full bg-bg border border-zinc-800 rounded px-3 py-2 text-sm"
        />
        <button
          onClick={() => submit.mutate()}
          disabled={!name || !email || submit.isPending}
          className="bg-accent text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          Submit request
        </button>
      </div>
      <div className="bg-surface border border-zinc-800 rounded-lg">
        {list.data?.items.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500">No transcript requests yet.</div>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {list.data?.items.map((r) => (
              <li key={r.id} className="p-4 text-sm">
                <div className="font-medium">{r.recipient_name}</div>
                <div className="text-xs text-zinc-500">{r.recipient_email}</div>
                <div className="text-xs text-zinc-400 mt-1">
                  {r.status} · {new Date(r.requested_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
