import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

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
      <h1 className="text-2xl font-semibold">Grades</h1>
      {isLoading ? (
        <div className="h-64 bg-surface rounded-lg animate-pulse" />
      ) : data?.items.length === 0 ? (
        <div className="text-sm text-zinc-500">No grades recorded yet.</div>
      ) : (
        <div className="bg-surface border border-zinc-800 rounded-lg">
          <table className="w-full text-sm">
            <thead className="text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3">Course</th>
                <th className="text-left px-4 py-3">Assessment</th>
                <th className="text-right px-4 py-3">Score</th>
                <th className="text-right px-4 py-3">Pass mark</th>
                <th className="text-left px-4 py-3">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((g) => (
                <tr key={g.id} className="border-b border-zinc-800/60">
                  <td className="px-4 py-3">{g.course_external_id}</td>
                  <td className="px-4 py-3 text-zinc-400">{g.assessment_id}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={g.value < g.threshold ? 'text-danger' : 'text-success'}>
                      {g.value}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-500">{g.threshold}%</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(g.recorded_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
