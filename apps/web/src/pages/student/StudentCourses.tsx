import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { StatusBadge } from '../../components/ui/Badge.js';
import { Icon } from '../../components/ui/Icon.js';

type Course = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  prerequisites: Array<{ requires_course: { code: string; name: string } }>;
};

type Enrollment = {
  id: string;
  status: string;
  term: string | null;
  course: { code: string; name: string };
};

export function StudentCourses(): JSX.Element {
  const catalog = useQuery({
    queryKey: ['catalog'],
    queryFn: () => api<{ items: Course[] }>('/api/v1/courses'),
  });
  const my = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => api<{ items: Enrollment[] }>('/api/v1/courses/me/enrollments'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Courses" description="Your active enrollments and the catalog of available courses." />

      <section>
        <div className="text-[11px] uppercase tracking-widest text-muted mb-2">Your courses</div>
        {my.data?.items.length === 0 ? (
          <EmptyState
            icon={<Icon name="book" size={20} />}
            title="No enrollments yet"
            description="Browse the catalog below to see what's available."
          />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-muted bg-bg/40 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Code</th>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Term</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {my.data?.items.map((e) => (
                  <tr key={e.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/40">
                    <td className="px-4 py-3 font-mono text-xs">{e.course.code}</td>
                    <td className="px-4 py-3">{e.course.name}</td>
                    <td className="px-4 py-3 text-zinc-400">{e.term ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section>
        <div className="text-[11px] uppercase tracking-widest text-muted mb-2">Catalog</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {catalog.data?.items.map((c) => (
            <Card key={c.id} className="p-5 hover:border-border-strong transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-mono text-muted">{c.code}</div>
                  <div className="font-medium mt-0.5">{c.name}</div>
                </div>
              </div>
              {c.description && (
                <div className="text-sm text-zinc-400 mt-2 line-clamp-3">{c.description}</div>
              )}
              {c.prerequisites.length > 0 && (
                <div className="text-xs text-muted mt-3 flex items-center gap-2 flex-wrap">
                  <Icon name="alert" size={12} />
                  Prereqs:
                  {c.prerequisites.map((p) => (
                    <span key={p.requires_course.code} className="bg-surface-3 px-2 py-0.5 rounded font-mono text-[10px]">
                      {p.requires_course.code}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
