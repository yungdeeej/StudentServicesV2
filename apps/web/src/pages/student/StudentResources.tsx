import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.js';
import { Icon, type IconName } from '../../components/ui/Icon.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Skeleton } from '../../components/ui/Spinner.js';
import { cn } from '../../components/ui/cn.js';

type Resource = {
  id: string;
  title: string;
  body_md: string | null;
  url: string | null;
  topic: string;
  kind: string;
  is_crisis: boolean;
  tags: string[];
};

const TOPICS: Array<{ id: string; label: string; icon: IconName }> = [
  { id: '', label: 'All', icon: 'spark' },
  { id: 'mental_health', label: 'Mental health', icon: 'heart' },
  { id: 'study_skills', label: 'Study skills', icon: 'graduation' },
  { id: 'time_management', label: 'Time management', icon: 'calendar' },
  { id: 'technology', label: 'Tech help', icon: 'spark' },
  { id: 'attendance', label: 'Attendance', icon: 'check' },
  { id: 'practicum', label: 'Practicum', icon: 'briefcase' },
  { id: 'general', label: 'General', icon: 'page' },
];

export function StudentResources(): JSX.Element {
  const [topic, setTopic] = useState('');
  const list = useQuery({
    queryKey: ['resources', topic],
    queryFn: () => api<{ items: Resource[] }>(`/api/v1/resources${topic ? `?topic=${topic}` : ''}`),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Resources" description="Articles, videos, and crisis hotlines curated by our team." />
      <div className="flex gap-2 flex-wrap">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTopic(t.id)}
            className={cn(
              'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition',
              topic === t.id
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-zinc-300 hover:border-border-strong',
            )}
          >
            <Icon name={t.icon} size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {list.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.data?.items.map((r) => (
            <a
              key={r.id}
              href={r.url ?? '#'}
              target={r.url?.startsWith('http') || r.url?.startsWith('tel:') ? '_blank' : undefined}
              rel="noreferrer"
              className={cn(
                'group block bg-surface border rounded-xl p-5 transition hover:border-border-strong',
                r.is_crisis ? 'border-danger/40 hover:bg-danger/5' : 'border-border hover:bg-surface-2',
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={cn(
                    'w-7 h-7 rounded-md grid place-items-center',
                    r.is_crisis ? 'bg-danger/15 text-danger' : 'bg-accent/10 text-accent',
                  )}
                >
                  <Icon name={r.is_crisis ? 'heart' : kindIcon(r.kind)} size={14} />
                </span>
                <span className={cn('text-[10px] uppercase tracking-widest', r.is_crisis ? 'text-danger' : 'text-muted')}>
                  {r.is_crisis ? 'Crisis' : r.topic.replace(/_/g, ' ')}
                </span>
                {r.url && (
                  <span className="ml-auto text-muted group-hover:text-ink transition">
                    <Icon name="external" size={12} />
                  </span>
                )}
              </div>
              <div className={cn('font-medium', r.is_crisis && 'text-danger')}>{r.title}</div>
              {r.body_md && (
                <div className="text-xs text-muted mt-2 line-clamp-3">{r.body_md}</div>
              )}
              {r.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {r.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] bg-surface-3 text-zinc-300 rounded px-2 py-0.5"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function kindIcon(kind: string): IconName {
  if (kind === 'video') return 'spark';
  if (kind === 'pdf') return 'page';
  if (kind === 'external_link') return 'external';
  if (kind === 'hotline') return 'heart';
  return 'book';
}
