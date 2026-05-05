import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-appointments'] }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Appointments</h1>
      <p className="text-sm text-zinc-500">
        Upcoming meetings with your support team. Cancellations are immediate; rescheduling sends a
        message to your coordinator.
      </p>
      <div className="bg-surface border border-zinc-800 rounded-lg">
        {me.data?.items.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500">No appointments scheduled.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Mode</th>
                <th className="text-left px-4 py-3">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {me.data?.items.map((a) => (
                <tr key={a.id} className="border-b border-zinc-800/60">
                  <td className="px-4 py-3">{new Date(a.scheduled_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{a.kind}</td>
                  <td className="px-4 py-3">{a.location}</td>
                  <td className="px-4 py-3">{a.status}</td>
                  <td className="px-4 py-3 text-right">
                    {a.status !== 'cancelled' && a.status !== 'completed' && (
                      <button
                        onClick={() => cancel.mutate(a.id)}
                        className="text-xs text-danger hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="text-xs text-zinc-500">
        To request a new appointment, head to <strong>Messages</strong> or browse Tutoring / Wellness pages.
      </div>
    </div>
  );
}
