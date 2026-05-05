import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { auth } from '../../lib/auth.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Field, Input, Textarea } from '../../components/ui/Input.js';
import { Icon } from '../../components/ui/Icon.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { useToast } from '../../components/ui/Toast.js';

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
  const toast = useToast();
  const list = useQuery({
    queryKey: ['groups'],
    queryFn: () => api<{ items: Group[] }>('/api/v1/study-groups'),
  });
  const me = useQuery({
    queryKey: ['student-me-for-groups'],
    queryFn: () => api<{ campus_id: string }>('/api/v1/student/me'),
    enabled: auth.isStudent(),
  });

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [meetingPattern, setMeetingPattern] = useState('');

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
      setCreating(false);
      void qc.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group created', 'Invite friends from your cohort to join.');
    },
  });

  const join = useMutation({
    mutationFn: (id: string) => api(`/api/v1/study-groups/${id}/join`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Joined the group');
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Study groups"
        description="Find or start a group on your campus."
        action={
          !creating && (
            <Button leftIcon={<Icon name="plus" size={14} />} onClick={() => setCreating(true)}>
              New group
            </Button>
          )
        }
      />

      {creating && (
        <Card className="p-5 space-y-3">
          <Field label="Group name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anatomy Study Crew" />
          </Field>
          <Field label="What you're studying">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Topics, course code, vibe…"
            />
          </Field>
          <Field label="Meeting pattern" hint="optional">
            <Input
              value={meetingPattern}
              onChange={(e) => setMeetingPattern(e.target.value)}
              placeholder="Tue 6pm @ Library"
              leftIcon={<Icon name="calendar" size={14} />}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => create.mutate()}
              disabled={!name || !me.data}
              loading={create.isPending}
            >
              Create group
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.data?.items.map((g) => {
          const full = g._count.members >= g.max_members;
          return (
            <Card key={g.id} className="p-5 flex flex-col gap-3">
              <div>
                <div className="font-medium">{g.name}</div>
                {g.description && (
                  <div className="text-sm text-zinc-400 mt-1 line-clamp-3">{g.description}</div>
                )}
              </div>
              <div className="text-xs text-muted space-y-1">
                {g.meeting_pattern && (
                  <div className="flex items-center gap-2">
                    <Icon name="calendar" size={12} />
                    {g.meeting_pattern}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Icon name="group" size={12} />
                  {g._count.members}/{g.max_members} members
                </div>
              </div>
              <Button
                variant={full ? 'secondary' : 'soft'}
                size="sm"
                disabled={full}
                onClick={() => join.mutate(g.id)}
              >
                {full ? 'Group full' : 'Join'}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
