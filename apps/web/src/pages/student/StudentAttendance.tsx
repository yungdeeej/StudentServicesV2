import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Tile } from '../../components/Tile.js';

type Att = {
  items: Array<{ id: string; session_id: string; occurred_at: string; present: boolean; source: string }>;
  summary: { total: number; present: number; pct: number };
};

export function StudentAttendance(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['student-attendance'],
    queryFn: () => api<Att>('/api/v1/student/attendance'),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Attendance</h1>
      {isLoading || !data ? (
        <div className="h-64 bg-surface rounded-lg animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Tile
              label="Last 90 days"
              value={`${data.summary.pct}%`}
              tone={data.summary.pct >= 80 ? 'success' : data.summary.pct >= 65 ? 'warn' : 'danger'}
            />
            <Tile label="Sessions" value={data.summary.total} />
            <Tile label="Present" value={data.summary.present} />
          </div>
          <div className="bg-surface border border-zinc-800 rounded-lg">
            <table className="w-full text-sm">
              <thead className="text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="text-left px-4 py-3">Session</th>
                  <th className="text-left px-4 py-3">Source</th>
                  <th className="text-left px-4 py-3">When</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-800/60">
                    <td className="px-4 py-3">{a.session_id}</td>
                    <td className="px-4 py-3 text-zinc-400">{a.source}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(a.occurred_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {a.present ? (
                        <span className="text-success">Present</span>
                      ) : (
                        <span className="text-danger">Absent</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
