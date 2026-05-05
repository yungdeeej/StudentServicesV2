import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { auth } from '../../lib/auth.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Field, Input, Textarea } from '../../components/ui/Input.js';
import { Icon } from '../../components/ui/Icon.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Skeleton } from '../../components/ui/Spinner.js';
import { cn } from '../../components/ui/cn.js';

type Thread = {
  id: string;
  subject: string;
  status: string;
  last_message_at: string | null;
  confidential: boolean;
  _count: { messages: number };
};

type Detail = {
  id: string;
  subject: string;
  confidential: boolean;
  messages: Array<{ id: string; body: string; sender_user_id: string; created_at: string }>;
};

export function StudentMessages(): JSX.Element {
  const qc = useQueryClient();
  const me = auth.getUser();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [composing, setComposing] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');

  const threads = useQuery({
    queryKey: ['msg-threads'],
    queryFn: () => api<{ items: Thread[] }>('/api/v1/messaging/threads'),
  });
  const detail = useQuery({
    queryKey: ['msg-thread', activeId],
    queryFn: () => api<Detail>(`/api/v1/messaging/threads/${activeId}`),
    enabled: Boolean(activeId),
  });

  const startThread = useMutation({
    mutationFn: () =>
      api<{ thread: { id: string } }>('/api/v1/messaging/threads', {
        method: 'POST',
        body: JSON.stringify({ subject: newSubject, body: newBody }),
      }),
    onSuccess: (data) => {
      setNewSubject('');
      setNewBody('');
      setComposing(false);
      setActiveId(data.thread.id);
      void qc.invalidateQueries({ queryKey: ['msg-threads'] });
    },
  });
  const reply = useMutation({
    mutationFn: () =>
      api(`/api/v1/messaging/threads/${activeId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: draft }),
      }),
    onSuccess: () => {
      setDraft('');
      void qc.invalidateQueries({ queryKey: ['msg-thread', activeId] });
      void qc.invalidateQueries({ queryKey: ['msg-threads'] });
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Messages"
        description="Talk to your coordinator or services team. Replies are usually within 1 business day."
        action={
          <Button leftIcon={<Icon name="plus" size={14} />} onClick={() => setComposing(true)}>
            New conversation
          </Button>
        }
      />

      <div className="grid md:grid-cols-3 gap-4 min-h-[28rem]">
        <Card className="md:col-span-1 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border text-[11px] uppercase tracking-widest text-muted">
            Inbox
          </div>
          {threads.isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : threads.data?.items.length === 0 ? (
            <div className="p-6 text-sm text-muted">No conversations yet.</div>
          ) : (
            <ul className="overflow-y-auto">
              {threads.data?.items.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b border-border/50 hover:bg-surface-2 transition',
                      activeId === t.id && 'bg-surface-2',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {t.confidential && (
                        <span className="text-warn" aria-label="confidential">
                          <Icon name="shield" size={12} />
                        </span>
                      )}
                      <div className="text-sm font-medium truncate flex-1">{t.subject}</div>
                    </div>
                    <div className="text-[11px] text-muted mt-1 flex items-center gap-2">
                      <span>{t._count.messages} message{t._count.messages === 1 ? '' : 's'}</span>
                      {t.last_message_at && (
                        <>
                          <span>·</span>
                          <span>{relativeTime(t.last_message_at)}</span>
                        </>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="md:col-span-2 flex flex-col overflow-hidden">
          {composing ? (
            <ComposePanel
              subject={newSubject}
              body={newBody}
              onSubject={setNewSubject}
              onBody={setNewBody}
              onCancel={() => setComposing(false)}
              onSend={() => startThread.mutate()}
              sending={startThread.isPending}
            />
          ) : !activeId ? (
            <EmptyState
              icon={<Icon name="message" size={20} />}
              title="No conversation selected"
              description="Pick one on the left or start a new conversation."
              action={<Button onClick={() => setComposing(true)}>Start a conversation</Button>}
            />
          ) : detail.data ? (
            <ThreadView
              detail={detail.data}
              currentUserId={me?.id ?? ''}
              draft={draft}
              setDraft={setDraft}
              onSend={() => reply.mutate()}
              sending={reply.isPending}
            />
          ) : (
            <Skeleton className="m-4 flex-1" />
          )}
        </Card>
      </div>
    </div>
  );
}

function ComposePanel({
  subject,
  body,
  onSubject,
  onBody,
  onCancel,
  onSend,
  sending,
}: {
  subject: string;
  body: string;
  onSubject: (s: string) => void;
  onBody: (s: string) => void;
  onCancel: () => void;
  onSend: () => void;
  sending: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">New conversation</div>
          <div className="text-xs text-muted">Goes to your assigned coordinator.</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <div className="p-5 space-y-3 flex-1">
        <Field label="Subject" required>
          <Input value={subject} onChange={(e) => onSubject(e.target.value)} placeholder="What's it about?" />
        </Field>
        <Field label="Message" required>
          <Textarea
            value={body}
            onChange={(e) => onBody(e.target.value)}
            rows={8}
            placeholder="Tell us what's going on…"
          />
        </Field>
      </div>
      <div className="px-5 py-3 border-t border-border flex justify-end">
        <Button
          loading={sending}
          disabled={!subject || !body}
          onClick={onSend}
          rightIcon={<Icon name="send" size={14} />}
        >
          Send
        </Button>
      </div>
    </div>
  );
}

function ThreadView({
  detail,
  currentUserId,
  draft,
  setDraft,
  onSend,
  sending,
}: {
  detail: Detail;
  currentUserId: string;
  draft: string;
  setDraft: (s: string) => void;
  onSend: () => void;
  sending: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {detail.confidential && (
            <span className="text-warn" title="Confidential">
              <Icon name="shield" size={14} />
            </span>
          )}
          <div className="text-sm font-medium truncate">{detail.subject}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-bg/30">
        {detail.messages.map((m) => {
          const mine = m.sender_user_id === currentUserId;
          return (
            <div key={m.id} className={cn('flex gap-2', mine ? 'justify-end' : 'justify-start')}>
              {!mine && <Avatar name="MCG" size="sm" />}
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                  mine
                    ? 'bg-accent text-white rounded-br-sm'
                    : 'bg-surface-2 text-ink border border-border rounded-bl-sm',
                )}
              >
                <div>{m.body}</div>
                <div
                  className={cn(
                    'text-[10px] mt-1',
                    mine ? 'text-white/70 text-right' : 'text-muted',
                  )}
                >
                  {new Date(m.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border p-3 flex gap-2 items-end bg-surface">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Reply…"
          rows={2}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && draft) onSend();
          }}
        />
        <Button
          onClick={onSend}
          loading={sending}
          disabled={!draft}
          rightIcon={<Icon name="send" size={14} />}
        >
          Send
        </Button>
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
