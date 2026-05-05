import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { Card } from '../components/ui/Card.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Avatar } from '../components/ui/Avatar.js';
import { Skeleton } from '../components/ui/Spinner.js';
import { Badge } from '../components/ui/Badge.js';
import { Icon } from '../components/ui/Icon.js';

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
      <PageHeader title="Inbox" description="Conversations from students you're scoped to." />
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : data?.items.length === 0 ? (
        <EmptyState icon={<Icon name="message" size={20} />} title="Inbox empty" description="When a student messages you, it'll show here." />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {data?.items.map((t) => (
              <li key={t.id} className="p-4 flex items-center gap-4 hover:bg-surface-2/40 transition">
                <Avatar name={`${t.student.first_name} ${t.student.last_name}`} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {t.confidential && (
                      <span className="text-warn" title="Confidential">
                        <Icon name="shield" size={12} />
                      </span>
                    )}
                    <div className="font-medium truncate">{t.subject}</div>
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {t.student.first_name} {t.student.last_name} · {t._count.messages} message
                    {t._count.messages === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="text-right">
                  {t.status !== 'open' && <Badge tone="neutral">{t.status}</Badge>}
                  <div className="text-[11px] text-muted mt-1">
                    {t.last_message_at ? new Date(t.last_message_at).toLocaleString() : '—'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
