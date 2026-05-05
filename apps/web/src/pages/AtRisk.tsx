import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { Card } from '../components/ui/Card.js';
import { Skeleton } from '../components/ui/Spinner.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Avatar } from '../components/ui/Avatar.js';
import { Icon } from '../components/ui/Icon.js';
import { cn } from '../components/ui/cn.js';

type AtRiskStudent = {
  id: string;
  first_name: string;
  last_name: string;
  flags: { risk_score: number };
  program: { name: string } | null;
  campus: { name: string } | null;
};

export function AtRisk(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['at-risk'],
    queryFn: () => api<{ items: AtRiskStudent[] }>('/api/v1/risk/at-risk'),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="At-risk students"
        description="Auto-flagged by the rules engine. Click into a student to see history and intervene."
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : data?.items.length === 0 ? (
        <EmptyState
          icon={<Icon name="check" size={20} />}
          title="No at-risk students"
          description="Nice work — everyone you're scoped to is in the green this week."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.items.map((s) => {
            const score = s.flags.risk_score;
            const tone = score >= 80 ? 'danger' : score >= 50 ? 'warn' : 'accent';
            return (
              <Card key={s.id} interactive className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={`${s.first_name} ${s.last_name}`} size="md" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {s.first_name} {s.last_name}
                      </div>
                      <div className="text-xs text-muted truncate">
                        {s.campus?.name} · {s.program?.name}
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-sm font-semibold',
                      tone === 'danger' && 'bg-danger/15 text-danger',
                      tone === 'warn' && 'bg-warn/15 text-warn',
                      tone === 'accent' && 'bg-accent/15 text-accent',
                    )}
                  >
                    {score}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
