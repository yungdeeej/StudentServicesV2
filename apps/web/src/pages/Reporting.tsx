import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { Tile } from '../components/Tile.js';

type Operational = {
  openCases: number;
  escalations: number;
  openInterventions: number;
  openTasks: number;
};

export function Reporting(): JSX.Element {
  const { data } = useQuery({
    queryKey: ['ops'],
    queryFn: () => api<Operational>('/api/v1/reporting/kpi/operational'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reporting</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Open cases" value={data?.openCases ?? 0} />
        <Tile label="Escalations" value={data?.escalations ?? 0} tone="danger" />
        <Tile label="Open interventions" value={data?.openInterventions ?? 0} />
        <Tile label="Open tasks" value={data?.openTasks ?? 0} />
      </div>
      <a
        href="/api/v1/reporting/exports/students.csv"
        className="inline-block bg-accent/20 text-accent px-4 py-2 rounded text-sm"
      >
        Export students.csv
      </a>
    </div>
  );
}
