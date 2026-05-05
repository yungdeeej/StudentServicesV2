import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Field, Input, Select } from '../../components/ui/Input.js';
import { Icon } from '../../components/ui/Icon.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { StatusBadge, Badge } from '../../components/ui/Badge.js';
import { useToast } from '../../components/ui/Toast.js';

type Req = {
  id: string;
  subject: string;
  topic: string | null;
  urgency: string;
  status: string;
  created_at: string;
  sessions: Array<{ id: string; scheduled_at: string; status: string }>;
};

export function StudentTutoring(): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({
    queryKey: ['tutoring-me'],
    queryFn: () => api<{ items: Req[] }>('/api/v1/tutoring/requests/me'),
  });
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'normal' | 'high'>('normal');
  const submit = useMutation({
    mutationFn: () =>
      api('/api/v1/tutoring/requests', {
        method: 'POST',
        body: JSON.stringify({ subject, topic: topic || undefined, urgency }),
      }),
    onSuccess: () => {
      setSubject('');
      setTopic('');
      void qc.invalidateQueries({ queryKey: ['tutoring-me'] });
      toast.success('Tutoring requested', 'We typically match within 2 business days.');
    },
    onError: () => toast.error('Could not submit', 'Please try again.'),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tutoring"
        description="Need help with a class? Tell us the subject and we'll match you with a tutor (peer or staff)."
      />
      <Card className="p-5 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Subject" required>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Anatomy"
              leftIcon={<Icon name="book" size={14} />}
            />
          </Field>
          <Field label="Specific topic" hint="optional">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Heart valves chapter"
            />
          </Field>
          <Field label="Urgency">
            <Select value={urgency} onChange={(e) => setUrgency(e.target.value as 'low' | 'normal' | 'high')}>
              <option value="low">Low — within 2 weeks</option>
              <option value="normal">Normal — within 1 week</option>
              <option value="high">Urgent — exam soon</option>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => submit.mutate()}
            disabled={!subject}
            loading={submit.isPending}
            rightIcon={<Icon name="arrowRight" size={14} />}
          >
            Request tutoring
          </Button>
        </div>
      </Card>

      {list.data?.items.length === 0 ? (
        <EmptyState
          icon={<Icon name="sparkleHeart" size={20} />}
          title="No tutoring requests yet"
          description="Drop a request above and we'll match you with someone who can help."
        />
      ) : (
        <div className="space-y-3">
          {list.data?.items.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{r.subject}</div>
                  {r.topic && <div className="text-xs text-muted mt-0.5">{r.topic}</div>}
                  <div className="text-xs text-muted mt-2 flex items-center gap-2">
                    <Badge tone={r.urgency === 'high' ? 'danger' : r.urgency === 'normal' ? 'accent' : 'neutral'}>
                      {r.urgency}
                    </Badge>
                    <span>·</span>
                    <span>Requested {new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              {r.sessions.length > 0 && (
                <ul className="mt-3 pt-3 border-t border-border space-y-1">
                  {r.sessions.map((s) => (
                    <li key={s.id} className="text-xs text-muted flex items-center gap-2">
                      <Icon name="calendar" size={12} />
                      <span>{new Date(s.scheduled_at).toLocaleString()}</span>
                      <StatusBadge status={s.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
