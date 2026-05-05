import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Field, Textarea } from '../../components/ui/Input.js';
import { Icon } from '../../components/ui/Icon.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { useToast } from '../../components/ui/Toast.js';
import { cn } from '../../components/ui/cn.js';

type Resource = { id: string; title: string; url: string | null; body_md: string | null };

type CheckinResp = {
  checkin: { risk_tier: string; phq2_total: number };
  crisis_resources: Resource[];
  message: string;
};

const PHQ_OPTIONS = [
  { v: 0, label: 'Not at all', emoji: '😌' },
  { v: 1, label: 'Several days', emoji: '😐' },
  { v: 2, label: 'More than half', emoji: '😕' },
  { v: 3, label: 'Nearly every day', emoji: '😞' },
];

const STRESS_LABELS = ['😄', '😊', '🙂', '😐', '😕', '😟', '😣', '😖', '😫', '😩', '😱'];

export function StudentWellness(): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();
  const [phq2_q1, setQ1] = useState(0);
  const [phq2_q2, setQ2] = useState(0);
  const [stress, setStress] = useState(3);
  const [free, setFree] = useState('');
  const [result, setResult] = useState<CheckinResp | null>(null);

  const crisis = useQuery({
    queryKey: ['crisis-resources'],
    queryFn: () => api<{ items: Resource[] }>('/api/v1/wellness/crisis-resources'),
  });

  const submit = useMutation<CheckinResp, Error, void>({
    mutationFn: () =>
      api<CheckinResp>('/api/v1/wellness/checkins', {
        method: 'POST',
        body: JSON.stringify({
          phq2_q1,
          phq2_q2,
          stress_score: stress,
          free_text: free.trim() || undefined,
        }),
      }),
    onSuccess: (data) => {
      setResult(data);
      void qc.invalidateQueries({ queryKey: ['student-tasks'] });
      toast.success(
        'Check-in submitted',
        data.checkin.risk_tier === 'crisis' || data.checkin.risk_tier === 'high'
          ? 'A counselor will be in touch.'
          : 'Thanks for checking in with yourself.',
      );
    },
    onError: () => toast.error('Could not submit', 'Please try again.'),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        eyebrow="Confidential"
        title="Wellness check-in"
        description="Two quick questions about how you've felt over the last 2 weeks, plus a stress rating. Responses go to our counseling team — confidentially."
      />

      <Card className="p-6 md:p-8 space-y-8">
        <div>
          <div className="text-sm font-medium mb-1">Over the last 2 weeks…</div>
          <div className="text-xs text-muted mb-4">
            Little interest or pleasure in doing things
          </div>
          <EmojiOptions value={phq2_q1} onChange={setQ1} />
        </div>

        <div>
          <div className="text-xs text-muted mb-4">Feeling down, depressed, or hopeless</div>
          <EmojiOptions value={phq2_q2} onChange={setQ2} />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-3">
            <div className="text-sm font-medium">Stress level right now</div>
            <div className="text-2xl">{STRESS_LABELS[stress] ?? '😐'}</div>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            value={stress}
            onChange={(e) => setStress(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-[10px] text-muted mt-1">
            <span>calm</span>
            <span>{stress}/10</span>
            <span>overwhelmed</span>
          </div>
        </div>

        <Field label="Anything you'd like to share?" hint="Optional. Free text — we read every word.">
          <Textarea
            value={free}
            onChange={(e) => setFree(e.target.value)}
            rows={4}
            placeholder="What's on your mind?"
          />
        </Field>

        <Button
          onClick={() => submit.mutate()}
          loading={submit.isPending}
          size="lg"
          className="w-full"
          rightIcon={<Icon name="arrowRight" size={16} />}
        >
          Submit check-in
        </Button>
      </Card>

      {result && (
        <Card
          className={cn(
            'p-6 animate-in',
            result.checkin.risk_tier === 'crisis' && 'border-danger',
            result.checkin.risk_tier === 'high' && 'border-warn',
          )}
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'w-10 h-10 rounded-lg grid place-items-center shrink-0',
                result.checkin.risk_tier === 'crisis'
                  ? 'bg-danger/15 text-danger'
                  : result.checkin.risk_tier === 'high'
                    ? 'bg-warn/15 text-warn'
                    : 'bg-accent/15 text-accent',
              )}
            >
              <Icon name="heart" size={20} />
            </span>
            <div className="flex-1">
              <div className="text-sm font-medium">Thanks for checking in</div>
              <div className="text-sm text-zinc-300 mt-2 leading-relaxed">{result.message}</div>
            </div>
          </div>
          {result.crisis_resources.length > 0 && (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-2">
              {result.crisis_resources.map((r) => (
                <CrisisLink key={r.id} resource={r} />
              ))}
            </div>
          )}
        </Card>
      )}

      {crisis.data && crisis.data.items.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted mb-3">
            Need help right now?
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {crisis.data.items.map((r) => (
              <CrisisLink key={r.id} resource={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmojiOptions({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}): JSX.Element {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {PHQ_OPTIONS.map((o) => {
        const active = value === o.v;
        return (
          <button
            type="button"
            key={o.v}
            onClick={() => onChange(o.v)}
            className={cn(
              'p-4 rounded-xl border transition flex flex-col items-center gap-2 text-center',
              active
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-zinc-300 hover:border-border-strong hover:bg-surface-2',
            )}
            aria-pressed={active}
          >
            <span className="text-2xl">{o.emoji}</span>
            <span className="text-xs font-medium">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CrisisLink({ resource }: { resource: Resource }): JSX.Element {
  return (
    <a
      href={resource.url ?? '#'}
      target={resource.url?.startsWith('http') ? '_blank' : undefined}
      rel="noreferrer"
      className="block bg-surface border border-danger/30 rounded-xl p-4 hover:bg-danger/5 transition"
    >
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-lg bg-danger/15 text-danger grid place-items-center shrink-0">
          <Icon name="heart" size={16} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-danger">{resource.title}</div>
          {resource.body_md && (
            <div className="text-xs text-muted mt-1 line-clamp-2">{resource.body_md}</div>
          )}
        </div>
      </div>
    </a>
  );
}
