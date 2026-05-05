import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { Stat } from '../components/ui/Stat.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Icon } from '../components/ui/Icon.js';

type Distribution = { tiers: Array<{ engagement_tier: string; _count: { _all: number } }> };

export function Engagement(): JSX.Element {
  const { data } = useQuery({
    queryKey: ['engagement-dist'],
    queryFn: () => api<Distribution>('/api/v1/engagement/distribution'),
  });
  const counts = (data?.tiers ?? []).reduce<Record<string, number>>((acc, t) => {
    acc[t.engagement_tier] = t._count._all;
    return acc;
  }, {});
  const total = (counts.high ?? 0) + (counts.medium ?? 0) + (counts.low ?? 0);
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Engagement"
        description="Tier distribution computed from event attendance, newsletter opens, and outreach response."
      />
      <div className="grid grid-cols-3 gap-4">
        <Stat
          label="High"
          value={counts.high ?? 0}
          tone="success"
          hint={`${pct(counts.high ?? 0)}%`}
          icon={<Icon name="trending" size={16} />}
        />
        <Stat
          label="Medium"
          value={counts.medium ?? 0}
          tone="warn"
          hint={`${pct(counts.medium ?? 0)}%`}
          icon={<Icon name="spark" size={16} />}
        />
        <Stat
          label="Low"
          value={counts.low ?? 0}
          tone="danger"
          hint={`${pct(counts.low ?? 0)}%`}
          icon={<Icon name="alert" size={16} />}
        />
      </div>
    </div>
  );
}
