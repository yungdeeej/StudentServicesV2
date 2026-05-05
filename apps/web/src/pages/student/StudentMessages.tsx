import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

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
  messages: Array<{ id: string; body: string; sender_user_id: string; created_at: string }>;
};

export function StudentMessages(): JSX.Element {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
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
      api('/api/v1/messaging/threads', {
        method: 'POST',
        body: JSON.stringify({ subject: newSubject, body: newBody }),
      }),
    onSuccess: () => {
      setNewSubject('');
      setNewBody('');
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
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Messages</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-3">
          <div className="bg-surface border border-zinc-800 rounded-lg p-4">
            <div className="text-sm font-medium mb-2">Start a new conversation</div>
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Subject"
              className="w-full bg-bg border border-zinc-800 rounded px-3 py-2 text-sm mb-2"
            />
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="What's going on?"
              rows={3}
              className="w-full bg-bg border border-zinc-800 rounded px-3 py-2 text-sm mb-2"
            />
            <button
              type="button"
              disabled={!newSubject || !newBody || startThread.isPending}
              onClick={() => startThread.mutate()}
              className="w-full bg-accent text-white rounded py-2 text-sm font-medium disabled:opacity-50"
            >
              {startThread.isPending ? 'Sending…' : 'Send'}
            </button>
          </div>
          <div className="bg-surface border border-zinc-800 rounded-lg overflow-hidden">
            {threads.data?.items.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-zinc-800/60 hover:bg-zinc-800/40 ${
                  activeId === t.id ? 'bg-zinc-800/60' : ''
                }`}
              >
                <div className="font-medium flex items-center gap-2">
                  {t.confidential && <span className="text-xs text-warn">🔒</span>}
                  {t.subject}
                </div>
                <div className="text-xs text-zinc-500">
                  {t._count.messages} message{t._count.messages === 1 ? '' : 's'}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 bg-surface border border-zinc-800 rounded-lg p-4 min-h-[24rem]">
          {!activeId && <div className="text-sm text-zinc-500">Select a conversation, or start a new one.</div>}
          {activeId && detail.data && (
            <div className="flex flex-col h-full gap-3">
              <div className="text-lg font-medium">{detail.data.subject}</div>
              <div className="flex-1 overflow-y-auto space-y-3">
                {detail.data.messages.map((m) => (
                  <div key={m.id} className="bg-bg border border-zinc-800 rounded p-3">
                    <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Reply…"
                  className="flex-1 bg-bg border border-zinc-800 rounded px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => reply.mutate()}
                  disabled={!draft || reply.isPending}
                  className="bg-accent text-white rounded px-4 text-sm disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
