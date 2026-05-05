import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Field, Input } from '../../components/ui/Input.js';
import { Icon } from '../../components/ui/Icon.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { StatusBadge } from '../../components/ui/Badge.js';
import { useToast } from '../../components/ui/Toast.js';
import { cn } from '../../components/ui/cn.js';

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

const KIND_TONE: Record<string, string> = {
  study_room: 'bg-emerald-500/15 text-emerald-400',
  equipment: 'bg-amber-500/15 text-amber-400',
  library: 'bg-cyan-500/15 text-cyan-400',
  lab: 'bg-violet-500/15 text-violet-400',
};

export function StudentBookings(): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();
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
      toast.success('Booked', 'See it in your bookings below.');
    },
    onError: () => toast.error('Slot conflict', 'That time is already taken.'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Book a study room" description="Pick a space, choose a time, you're done." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.data?.items.map((r) => (
          <button
            type="button"
            key={r.id}
            onClick={() => setSelected(r.id)}
            className={cn(
              'text-left bg-surface border rounded-xl p-5 transition',
              selected === r.id ? 'border-accent' : 'border-border hover:border-border-strong',
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-8 h-8 rounded-lg grid place-items-center ${KIND_TONE[r.kind] ?? 'bg-surface-3 text-zinc-300'}`}>
                <Icon name="pin" size={14} />
              </span>
              <div className="text-[10px] uppercase tracking-widest text-muted">{r.kind.replace('_', ' ')}</div>
            </div>
            <div className="font-medium">{r.name}</div>
            {r.location && <div className="text-xs text-muted mt-1">{r.location}</div>}
            <div className="text-xs text-muted mt-2">Capacity: {r.capacity}</div>
          </button>
        ))}
      </div>

      {selected && (
        <Card className="p-5">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Starts at" required>
              <Input
                type="datetime-local"
                onChange={(e) => setStart(new Date(e.target.value).toISOString())}
              />
            </Field>
            <Field label="Ends at" required>
              <Input
                type="datetime-local"
                onChange={(e) => setEnd(new Date(e.target.value).toISOString())}
              />
            </Field>
            <div className="flex items-end">
              <Button
                onClick={() => book.mutate()}
                disabled={!start || !end}
                loading={book.isPending}
                className="w-full"
                leftIcon={<Icon name="calendar" size={14} />}
              >
                Book
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div>
        <div className="text-[11px] uppercase tracking-widest text-muted mb-2">Your bookings</div>
        {my.data?.items.length === 0 ? (
          <EmptyState
            icon={<Icon name="calendar" size={20} />}
            title="No bookings yet"
            description="Pick a space above and grab a time."
          />
        ) : (
          <Card>
            <ul className="divide-y divide-border">
              {my.data?.items.map((b) => (
                <li key={b.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{b.resource.name}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {new Date(b.starts_at).toLocaleString()} — {new Date(b.ends_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
