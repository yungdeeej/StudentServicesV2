import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

type Resource = {
  id: string;
  kind: string;
  name: string;
  location: string | null;
  capacity: number;
};

type Booking = {
  id: string;
  resource: { name: string; kind: string; location: string | null };
  starts_at: string;
  ends_at: string;
  status: string;
};

export function StudentBookings(): JSX.Element {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['bookable-resources'],
    queryFn: () => api<{ items: Resource[] }>('/api/v1/bookable-resources'),
  });
  const my = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api<{ items: Booking[] }>('/api/v1/bookable-resources/bookings/me'),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const book = useMutation({
    mutationFn: () =>
      api('/api/v1/bookable-resources/bookings', {
        method: 'POST',
        body: JSON.stringify({ resource_id: selected, starts_at: start, ends_at: end }),
      }),
    onSuccess: () => {
      setSelected(null);
      setStart('');
      setEnd('');
      void qc.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Book a study room or equipment</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.data?.items.map((r) => (
          <button
            type="button"
            key={r.id}
            onClick={() => setSelected(r.id)}
            className={`text-left bg-surface border rounded-lg p-4 ${
              selected === r.id ? 'border-accent' : 'border-zinc-800'
            }`}
          >
            <div className="text-xs uppercase tracking-wide text-zinc-500">{r.kind}</div>
            <div className="font-medium">{r.name}</div>
            {r.location && <div className="text-xs text-zinc-500 mt-1">{r.location}</div>}
            <div className="text-xs text-zinc-500 mt-1">Capacity: {r.capacity}</div>
          </button>
        ))}
      </div>
      {selected && (
        <div className="bg-surface border border-zinc-800 rounded-lg p-4 grid sm:grid-cols-3 gap-3">
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(new Date(e.target.value).toISOString())}
            className="bg-bg border border-zinc-800 rounded px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(new Date(e.target.value).toISOString())}
            className="bg-bg border border-zinc-800 rounded px-3 py-2 text-sm"
          />
          <button
            onClick={() => book.mutate()}
            disabled={!start || !end || book.isPending}
            className="bg-accent text-white rounded px-4 text-sm disabled:opacity-50"
          >
            Book
          </button>
        </div>
      )}
      <div>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-2">Your bookings</h2>
        <div className="bg-surface border border-zinc-800 rounded-lg">
          {my.data?.items.length === 0 ? (
            <div className="p-6 text-sm text-zinc-500">No bookings yet.</div>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {my.data?.items.map((b) => (
                <li key={b.id} className="p-4 text-sm flex items-center justify-between">
                  <div>
                    <div className="font-medium">{b.resource.name}</div>
                    <div className="text-xs text-zinc-500">
                      {new Date(b.starts_at).toLocaleString()} — {new Date(b.ends_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">{b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
