import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

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
      <h1 className="text-2xl font-semibold">Courses</h1>
      <section>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-2">Your courses</h2>
        <div className="bg-surface border border-zinc-800 rounded-lg">
          {my.data?.items.length === 0 ? (
            <div className="p-6 text-sm text-zinc-500">Nothing yet — browse the catalog below.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Term</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {my.data?.items.map((e) => (
                  <tr key={e.id} className="border-b border-zinc-800/60">
                    <td className="px-4 py-3">{e.course.code}</td>
                    <td className="px-4 py-3">{e.course.name}</td>
                    <td className="px-4 py-3 text-zinc-400">{e.term ?? '—'}</td>
                    <td className="px-4 py-3">{e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      <section>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-2">Catalog</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {catalog.data?.items.map((c) => (
            <div key={c.id} className="bg-surface border border-zinc-800 rounded-lg p-4">
              <div className="text-sm font-mono text-zinc-500">{c.code}</div>
              <div className="font-medium">{c.name}</div>
              {c.description && (
                <div className="text-sm text-zinc-400 mt-1 line-clamp-3">{c.description}</div>
              )}
              {c.prerequisites.length > 0 && (
                <div className="text-xs text-zinc-500 mt-2">
                  Prereqs:{' '}
                  {c.prerequisites.map((p) => p.requires_course.code).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
