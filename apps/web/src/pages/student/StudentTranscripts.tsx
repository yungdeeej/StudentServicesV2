import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Field, Input, Textarea } from '../../components/ui/Input.js';
import { Icon } from '../../components/ui/Icon.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { StatusBadge } from '../../components/ui/Badge.js';
import { useToast } from '../../components/ui/Toast.js';

type Req = {
  id: string;
  recipient_name: string;
  recipient_email: string;
  status: string;
  requested_at: string;
};

export function StudentTranscripts(): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({
    queryKey: ['my-transcripts'],
    queryFn: () => api<{ items: Req[] }>('/api/v1/transcripts/me'),
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const submit = useMutation({
    mutationFn: () =>
      api('/api/v1/transcripts/me', {
        method: 'POST',
        body: JSON.stringify({ recipient_name: name, recipient_email: email, notes }),
      }),
    onSuccess: () => {
      setName('');
      setEmail('');
      setNotes('');
      void qc.invalidateQueries({ queryKey: ['my-transcripts'] });
      toast.success('Transcript request submitted', "We'll send you a release form to sign.");
    },
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader
        title="Transcript requests"
        description="Send an official transcript or program-completion verification. Sign the release form, and we deliver within 5 business days."
      />
      <Card className="p-5 space-y-3">
        <Field label="Recipient name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Hospital HR"
          />
        </Field>
        <Field label="Recipient email" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hr@example.com"
          />
        </Field>
        <Field label="Notes" hint="optional">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything we should know?"
          />
        </Field>
        <div className="flex justify-end">
          <Button
            onClick={() => submit.mutate()}
            disabled={!name || !email}
            loading={submit.isPending}
            rightIcon={<Icon name="send" size={14} />}
          >
            Submit request
          </Button>
        </div>
      </Card>

      {list.data?.items.length === 0 ? (
        <EmptyState
          icon={<Icon name="page" size={20} />}
          title="No transcript requests yet"
          description="Once you submit a request you'll see its status here."
        />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {list.data?.items.map((r) => (
              <li key={r.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{r.recipient_name}</div>
                  <div className="text-xs text-muted">{r.recipient_email}</div>
                  <div className="text-[11px] text-muted mt-1">
                    Requested {new Date(r.requested_at).toLocaleDateString()}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
