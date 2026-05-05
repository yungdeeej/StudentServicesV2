import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { auth } from '../../lib/auth.js';

type Group = {
  id: string;
  name: string;
  description: string | null;
  campus_id: string;
  course_external_id: string | null;
  meeting_pattern: string | null;
  max_members: number;
  _count: { members: number };
};

export function StudentStudyGroups(): JSX.Element {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['groups'],
    queryFn: () => api<{ items: Group[] }>('/api/v1/study-groups'),
  });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [meetingPattern, setMeetingPattern] = useState('');

  const me = useQuery({
    queryKey: ['student-me-for-groups'],
    queryFn: () => api<{ campus_id: string }>('/api/v1/student/me'),
    enabled: auth.isStudent(),
  });

  const create = useMutation({
    mutationFn: () =>
      api('/api/v1/study-groups', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          meeting_pattern: meetingPattern || undefined,
          campus_id: me.data?.campus_id,
          max_members: 8,
        }),
      }),
    onSuccess: () => {
      setName('');
      setDescription('');
      setMeetingPattern('');
      void qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const join = useMutation({
    mutationFn: (id: string) => api(`/api/v1/study-groups/${id}/join`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Study groups</h1>
      <div className="bg-surface border border-zinc-800 rounded-lg p-4 grid sm:grid-cols-3 gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          className="bg-bg border border-zinc-800 rounded px-3 py-2 text-sm"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What you're studying"
          className="bg-bg border border-zinc-800 rounded px-3 py-2 text-sm"
        />
        <input
          value={meetingPattern}
          onChange={(e) => setMeetingPattern(e.target.value)}
          placeholder="Meeting pattern (e.g. Tue 6pm)"
          className="bg-bg border border-zinc-800 rounded px-3 py-2 text-sm"
        />
        <div className="sm:col-span-3">
          <button
            onClick={() => create.mutate()}
            disabled={!name || !me.data || create.isPending}
            className="bg-accent text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            Create group
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.data?.items.map((g) => (
          <div key={g.id} className="bg-surface border border-zinc-800 rounded-lg p-4">
            <div className="font-medium">{g.name}</div>
            {g.description && <div className="text-sm text-zinc-400 mt-1">{g.description}</div>}
            {g.meeting_pattern && (
              <div className="text-xs text-zinc-500 mt-2">📅 {g.meeting_pattern}</div>
            )}
            <div className="text-xs text-zinc-500 mt-2">
              {g._count.members}/{g.max_members} members
            </div>
            <button
              onClick={() => join.mutate(g.id)}
              disabled={g._count.members >= g.max_members}
              className="mt-3 text-xs bg-accent/20 text-accent rounded px-3 py-1 disabled:opacity-50"
            >
              {g._count.members >= g.max_members ? 'Full' : 'Join'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
