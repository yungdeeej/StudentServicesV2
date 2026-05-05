import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { Card } from '../components/ui/Card.js';
import { Skeleton } from '../components/ui/Spinner.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Avatar } from '../components/ui/Avatar.js';
import { Badge, StatusBadge } from '../components/ui/Badge.js';
import { Input } from '../components/ui/Input.js';
import { Icon } from '../components/ui/Icon.js';

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  flags: {
    at_risk_flag: boolean;
    engagement_tier: string;
    risk_score: number;
    engagement_score: number;
  } | null;
};

type ListResp = { items: Student[]; total: number };

export function Students(): JSX.Element {
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => api<ListResp>('/api/v1/students?page_size=100'),
  });

  const filtered = (data?.items ?? []).filter((s) => {
    if (!q) return true;
    const t = `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase();
    return t.includes(q.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Students"
        description={data ? `${data.total} students across all campuses you can access.` : ''}
        action={
          <Input
            placeholder="Search by name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            leftIcon={<Icon name="search" size={14} />}
            className="w-64"
          />
        }
      />

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-muted bg-bg/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Student</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Risk</th>
                <th className="text-left px-4 py-3 font-medium">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border/60 last:border-0 hover:bg-surface-2/40 transition"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${s.first_name} ${s.last_name}`} size="sm" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {s.first_name} {s.last_name}
                        </div>
                        <div className="text-[11px] text-muted truncate">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3">
                    {s.flags?.at_risk_flag ? (
                      <span className="inline-flex items-center gap-1 text-danger font-medium text-xs">
                        <Icon name="alert" size={12} />
                        {s.flags.risk_score}
                      </span>
                    ) : (
                      <span className="text-muted text-xs">{s.flags?.risk_score ?? 0}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        tone={
                          s.flags?.engagement_tier === 'high'
                            ? 'success'
                            : s.flags?.engagement_tier === 'medium'
                              ? 'warn'
                              : 'danger'
                        }
                      >
                        {s.flags?.engagement_tier ?? '—'}
                      </Badge>
                      <span className="text-xs text-muted">{s.flags?.engagement_score ?? 0}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-sm text-muted px-4 py-12 text-center">
                    No matches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
