import { useQuery } from '@tanstack/react-query';
import { Tile } from '../components/Tile.js';
import { api } from '../lib/api.js';

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

  if (isLoading || !data) {
    return <Skeleton />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Executive Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Total students" value={data.total_students} />
        <Tile
          label="At risk"
          value={`${data.at_risk_pct}%`}
          hint={`${data.at_risk_count} students`}
          tone={data.at_risk_pct >= 25 ? 'danger' : data.at_risk_pct >= 15 ? 'warn' : 'success'}
        />
        <Tile label="90-day retention" value={`${data.retention_90d_pct}%`} tone="success" />
        <Tile label="Avg engagement score" value={data.engagement_score_avg} />
        <Tile
          label="Onboarding complete"
          value={`${data.onboarding_complete_pct}%`}
          hint={`${data.onboarding_complete_count} students`}
        />
        <Tile label="Withdrawn" value={data.withdrawn_count} tone="warn" />
        <Tile label="Graduated" value={data.graduated_count} tone="success" />
      </div>
    </div>
  );
}

function Skeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-28 bg-surface border border-zinc-800 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
