import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { Card } from '../components/ui/Card.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Avatar } from '../components/ui/Avatar.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Icon } from '../components/ui/Icon.js';
import { useToast } from '../components/ui/Toast.js';
import { cn } from '../components/ui/cn.js';

type Checkin = {
  id: string;
  phq2_total: number;
  stress_score: number;
  risk_tier: string;
  ai_flagged: boolean;
  occurred_at: string;
  free_text: string | null;
  student: { id: string; first_name: string; last_name: string };
};

export function StaffWellnessQueue(): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({
    queryKey: ['wellness-queue'],
    queryFn: () => api<{ items: Checkin[] }>('/api/v1/wellness/queue'),
  });
  const triage = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: string }) =>
      api(`/api/v1/wellness/checkins/${id}/triage`, {
        method: 'POST',
        body: JSON.stringify({ outcome }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wellness-queue'] });
      toast.success('Triaged');
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Confidential"
        title="Wellness triage"
        description="High and crisis tier check-ins. Crisis tier opens a confidential case automatically."
      />

      {list.data?.items.length === 0 ? (
        <EmptyState
          icon={<Icon name="check" size={20} />}
          title="Queue is clear"
          description="No high or crisis check-ins pending."
        />
      ) : (
        <div className="space-y-3">
          {list.data?.items.map((c) => (
            <Card
              key={c.id}
              className={cn(
                'p-5',
                c.risk_tier === 'crisis' ? 'border-danger' : 'border-warn/40',
              )}
            >
              <div className="flex items-start gap-4">
                <Avatar name={`${c.student.first_name} ${c.student.last_name}`} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium">
                      {c.student.first_name} {c.student.last_name}
                    </div>
                    <Badge tone={c.risk_tier === 'crisis' ? 'danger' : 'warn'} dot>
                      {c.risk_tier}
                    </Badge>
                    {c.ai_flagged && (
                      <Badge tone="danger">
                        <Icon name="alert" size={10} /> crisis phrase
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    PHQ-2 {c.phq2_total}/6 · stress {c.stress_score}/10 ·{' '}
                    {new Date(c.occurred_at).toLocaleString()}
                  </div>
                  {c.free_text && (
                    <blockquote className="text-sm text-zinc-300 mt-3 pl-3 border-l-2 border-border italic">
                      "{c.free_text}"
                    </blockquote>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {(['contacted', 'no_response', 'escalated', 'resolved'] as const).map((o) => (
                  <Button
                    key={o}
                    variant={o === 'escalated' ? 'danger' : o === 'resolved' ? 'soft' : 'secondary'}
                    size="sm"
                    onClick={() => triage.mutate({ id: c.id, outcome: o })}
                  >
                    {o.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
