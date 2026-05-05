import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Icon } from '../../components/ui/Icon.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { StatusBadge } from '../../components/ui/Badge.js';
import { useToast } from '../../components/ui/Toast.js';

type Appt = {
  id: string;
  kind: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string;
};

export function StudentAppointments(): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();
  const me = useQuery({
    queryKey: ['student-appointments'],
    queryFn: () => api<{ items: Appt[] }>('/api/v1/appointments/me'),
  });
  const cancel = useMutation({
    mutationFn: (id: string) =>
      api(`/api/v1/appointments/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: 'cancelled', reason: 'self-cancelled' }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-appointments'] });
      toast.success('Appointment cancelled');
    },
  });

  const upcoming = me.data?.items.filter((a) => new Date(a.scheduled_at) >= new Date() && a.status !== 'cancelled' && a.status !== 'completed') ?? [];
  const past = me.data?.items.filter((a) => !upcoming.includes(a)) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Upcoming meetings with your support team. Need to reschedule? Send a message."
      />

      <section>
        <div className="text-[11px] uppercase tracking-widest text-muted mb-2">Upcoming</div>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<Icon name="calendar" size={20} />}
            title="Nothing scheduled"
            description="To request a new appointment, head to Messages or your Tutoring / Wellness pages."
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <ApptCard key={a.id} a={a} canCancel onCancel={() => cancel.mutate(a.id)} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <div className="text-[11px] uppercase tracking-widest text-muted mb-2">Past</div>
          <div className="space-y-3">
            {past.map((a) => (
              <ApptCard key={a.id} a={a} canCancel={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ApptCard({
  a,
  canCancel,
  onCancel,
}: {
  a: Appt;
  canCancel: boolean;
  onCancel?: () => void;
}): JSX.Element {
  const date = new Date(a.scheduled_at);
  return (
    <Card className="p-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="bg-surface-2 border border-border rounded-lg p-3 text-center w-16 shrink-0">
          <div className="text-[10px] uppercase tracking-widest text-muted">
            {date.toLocaleDateString(undefined, { month: 'short' })}
          </div>
          <div className="text-2xl font-semibold leading-none mt-1">{date.getDate()}</div>
          <div className="text-[10px] text-muted mt-1">
            {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>
        <div>
          <div className="font-medium capitalize">{a.kind} appointment</div>
          <div className="text-xs text-muted mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <Icon name={a.location === 'video' ? 'spark' : a.location === 'phone' ? 'message' : 'pin'} size={12} />
              {a.location}
            </span>
            <span>·</span>
            <span>{a.duration_minutes} min</span>
          </div>
          <div className="mt-2"><StatusBadge status={a.status} /></div>
        </div>
      </div>
      {canCancel && (
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </Card>
  );
}
