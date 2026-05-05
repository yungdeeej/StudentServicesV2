import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { Stat } from '../components/ui/Stat.js';
import { Skeleton } from '../components/ui/Spinner.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Card } from '../components/ui/Card.js';
import { Icon } from '../components/ui/Icon.js';

type Overview = {
  total_students: number;
  at_risk_count: number;
  at_risk_pct: number;
  withdrawn_count: number;
  graduated_count: number;
  onboarding_complete_count: number;
  onboarding_complete_pct: number;
  retention_90d_pct: number;
  engagement_score_avg: number;
};

export function Dashboard(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['kpi-overview'],
    queryFn: () => api<Overview>('/api/v1/reporting/kpi/overview'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Executive overview"
        title="Workspace dashboard"
        description="Live KPIs across all campuses. Tiles update as events flow through the bus."
      />

      {isLoading || !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat
              label="Total students"
              value={data.total_students}
              icon={<Icon name="users" size={16} />}
            />
            <Stat
              label="At-risk %"
              value={`${data.at_risk_pct}%`}
              hint={`${data.at_risk_count} students`}
              tone={data.at_risk_pct >= 25 ? 'danger' : data.at_risk_pct >= 15 ? 'warn' : 'success'}
              icon={<Icon name="alert" size={16} />}
            />
            <Stat
              label="90-day retention"
              value={`${data.retention_90d_pct}%`}
              tone="success"
              icon={<Icon name="trending" size={16} />}
            />
            <Stat
              label="Avg engagement"
              value={data.engagement_score_avg}
              icon={<Icon name="spark" size={16} />}
            />
            <Stat
              label="Onboarded"
              value={`${data.onboarding_complete_pct}%`}
              hint={`${data.onboarding_complete_count} students`}
              icon={<Icon name="clipboard" size={16} />}
            />
            <Stat
              label="Withdrawn"
              value={data.withdrawn_count}
              tone="warn"
              icon={<Icon name="alert" size={16} />}
            />
            <Stat
              label="Graduated"
              value={data.graduated_count}
              tone="success"
              icon={<Icon name="graduation" size={16} />}
            />
            <Card className="p-5">
              <div className="text-[11px] uppercase tracking-widest text-muted">Live</div>
              <div className="mt-2 flex items-center gap-2 text-sm text-success">
                <span className="w-2 h-2 rounded-full bg-success animate-pulseDot" />
                Event bus connected
              </div>
              <div className="text-xs text-muted mt-2">
                KPIs refresh from <code className="text-zinc-300">/reporting/kpi/overview</code>.
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
