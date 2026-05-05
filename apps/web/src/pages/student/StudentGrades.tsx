import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.js';
import { Skeleton } from '../../components/ui/Spinner.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Icon } from '../../components/ui/Icon.js';
import { cn } from '../../components/ui/cn.js';

type Grade = {
  id: string;
  course_external_id: string;
  assessment_id: string;
  value: number;
  threshold: number;
  recorded_at: string;
};

export function StudentGrades(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['student-grades'],
    queryFn: () => api<{ items: Grade[] }>('/api/v1/student/grades'),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Grades" description="The most recent assessments from your courses." />
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : data?.items.length === 0 ? (
        <EmptyState
          icon={<Icon name="graduation" size={20} />}
          title="No grades recorded yet"
          description="Once your instructor enters grades, they'll show up here."
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-muted bg-bg/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Course</th>
                <th className="text-left px-4 py-3 font-medium">Assessment</th>
                <th className="text-right px-4 py-3 font-medium">Score</th>
                <th className="text-right px-4 py-3 font-medium">Pass mark</th>
                <th className="text-left px-4 py-3 font-medium">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((g) => (
                <tr key={g.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/40">
                  <td className="px-4 py-3 font-mono text-xs">{g.course_external_id}</td>
                  <td className="px-4 py-3 text-zinc-400">{g.assessment_id}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 font-medium',
                        g.value < g.threshold ? 'text-danger' : 'text-success',
                      )}
                    >
                      {g.value}%
                      {g.value < g.threshold && <Icon name="alert" size={12} />}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted">{g.threshold}%</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(g.recorded_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
