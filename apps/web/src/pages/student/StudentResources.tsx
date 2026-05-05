import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

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

const TOPICS = [
  { id: '', label: 'All' },
  { id: 'mental_health', label: 'Mental health' },
  { id: 'study_skills', label: 'Study skills' },
  { id: 'time_management', label: 'Time management' },
  { id: 'technology', label: 'Tech help' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'practicum', label: 'Practicum' },
  { id: 'general', label: 'General' },
];

export function StudentResources(): JSX.Element {
  const [topic, setTopic] = useState('');
  const list = useQuery({
    queryKey: ['resources', topic],
    queryFn: () =>
      api<{ items: Resource[] }>(`/api/v1/resources${topic ? `?topic=${topic}` : ''}`),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Resources</h1>
      <div className="flex gap-2 flex-wrap">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTopic(t.id)}
            className={`text-xs px-3 py-1 rounded-full border ${
              topic === t.id ? 'border-accent bg-accent/10 text-accent' : 'border-zinc-800 text-zinc-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.data?.items.map((r) => (
          <a
            key={r.id}
            href={r.url ?? '#'}
            target={r.url ? '_blank' : undefined}
            rel="noreferrer"
            className={`block bg-surface border rounded-lg p-4 hover:border-accent ${
              r.is_crisis ? 'border-danger/40' : 'border-zinc-800'
            }`}
          >
            <div className={`text-xs uppercase tracking-wide mb-1 ${r.is_crisis ? 'text-danger' : 'text-zinc-500'}`}>
              {r.is_crisis ? 'Crisis support' : r.topic.replace('_', ' ')}
            </div>
            <div className="font-medium">{r.title}</div>
            {r.body_md && (
              <div className="text-xs text-zinc-400 mt-2 line-clamp-3">{r.body_md}</div>
            )}
            {r.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {r.tags.map((t) => (
                  <span key={t} className="text-[10px] bg-zinc-800 text-zinc-300 rounded px-2 py-0.5">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
