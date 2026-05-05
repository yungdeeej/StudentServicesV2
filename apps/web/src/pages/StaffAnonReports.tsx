import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { Card } from '../components/ui/Card.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Button } from '../components/ui/Button.js';
import { StatusBadge } from '../components/ui/Badge.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Icon } from '../components/ui/Icon.js';
import { useToast } from '../components/ui/Toast.js';
import { cn } from '../components/ui/cn.js';

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
  const toast = useToast();
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anon-reports'] });
      toast.success('Updated');
    },
  });

  const activeReport = list.data?.items.find((r) => r.id === active);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Confidential"
        title="Anonymous reports"
        description="Submitted via the public form. Reporters can check status with a hashed claim token."
      />

      {list.data?.items.length === 0 ? (
        <EmptyState
          icon={<Icon name="shield" size={20} />}
          title="No reports"
          description="When someone submits a report, it'll show up here."
        />
      ) : (
        <div className="grid md:grid-cols-3 gap-4 min-h-[28rem]">
          <Card className="md:col-span-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border text-[11px] uppercase tracking-widest text-muted">
              Queue
            </div>
            <ul className="overflow-y-auto">
              {list.data?.items.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setActive(r.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b border-border/50 hover:bg-surface-2 transition',
                      active === r.id && 'bg-surface-2',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] uppercase tracking-widest text-muted">{r.category}</div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-sm font-medium mt-1 line-clamp-2">{r.body}</div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="md:col-span-2 p-5 overflow-hidden">
            {!activeReport ? (
              <div className="text-sm text-muted">Select a report.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-muted">{activeReport.category}</div>
                  <StatusBadge status={activeReport.status} />
                </div>
                <blockquote className="text-sm whitespace-pre-wrap pl-4 border-l-2 border-border">
                  {activeReport.body}
                </blockquote>
                {activeReport.contact_optional && (
                  <div className="text-xs text-muted">
                    Contact (optional): {activeReport.contact_optional}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                  {(['triaged', 'in_progress', 'resolved', 'closed_no_action'] as const).map((s) => (
                    <Button
                      key={s}
                      variant={s === 'resolved' ? 'soft' : s === 'closed_no_action' ? 'ghost' : 'secondary'}
                      size="sm"
                      onClick={() => update.mutate({ id: activeReport.id, status: s })}
                    >
                      {s.replace(/_/g, ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
