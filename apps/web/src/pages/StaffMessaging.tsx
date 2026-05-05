import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

type Thread = {
  id: string;
  subject: string;
  status: string;
  last_message_at: string | null;
  confidential: boolean;
  student: { first_name: string; last_name: string };
  _count: { messages: number };
};

export function StaffMessaging(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['staff-threads'],
    queryFn: () => api<{ items: Thread[] }>('/api/v1/messaging/threads'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Messages</h1>
      {isLoading ? (
        <div className="h-64 bg-surface rounded-lg animate-pulse" />
      ) : (
        <div className="bg-surface border border-zinc-800 rounded-lg">
          {data?.items.length === 0 ? (
            <div className="p-6 text-sm text-zinc-500">Inbox empty.</div>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {data?.items.map((t) => (
                <li key={t.id} className="p-4 flex items-start justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {t.confidential && <span className="text-xs text-warn">🔒 confidential</span>}
                      {t.subject}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {t.student.first_name} {t.student.last_name} · {t._count.messages} message
                      {t._count.messages === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {t.last_message_at ? new Date(t.last_message_at).toLocaleString() : '—'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
