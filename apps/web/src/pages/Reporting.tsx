import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { Stat } from '../components/ui/Stat.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Button } from '../components/ui/Button.js';
import { Icon } from '../components/ui/Icon.js';
import { Card } from '../components/ui/Card.js';

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
      <PageHeader
        title="Reporting"
        description="Operational pulse + exports. PDF rendering uses Playwright print on the server."
        action={
          <a href="/api/v1/reporting/exports/students.csv">
            <Button variant="secondary" leftIcon={<Icon name="external" size={14} />}>
              Export students.csv
            </Button>
          </a>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Open cases" value={data?.openCases ?? 0} icon={<Icon name="clipboard" size={16} />} />
        <Stat
          label="Escalations"
          value={data?.escalations ?? 0}
          tone="danger"
          icon={<Icon name="alert" size={16} />}
        />
        <Stat
          label="Open interventions"
          value={data?.openInterventions ?? 0}
          icon={<Icon name="spark" size={16} />}
        />
        <Stat label="Open tasks" value={data?.openTasks ?? 0} icon={<Icon name="bell" size={16} />} />
      </div>

      <Card className="p-6">
        <div className="text-sm font-medium mb-1">More dashboards</div>
        <p className="text-sm text-muted">
          KPI overview, operational, surveys, and the engagement heatmap all live behind
          <code className="text-zinc-300 mx-1">/api/v1/reporting/kpi/*</code> — wire them into your
          BI tool of choice.
        </p>
      </Card>
    </div>
  );
}
