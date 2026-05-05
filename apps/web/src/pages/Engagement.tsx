import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { Tile } from '../components/Tile.js';

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Engagement</h1>
      <div className="grid grid-cols-3 gap-4">
        <Tile label="High" value={counts.high ?? 0} tone="success" />
        <Tile label="Medium" value={counts.medium ?? 0} tone="warn" />
        <Tile label="Low" value={counts.low ?? 0} tone="danger" />
      </div>
    </div>
  );
}
