import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

type Resource = { id: string; title: string; url: string | null; body_md: string | null };

type CheckinResp = {
  checkin: { risk_tier: string; phq2_total: number };
  crisis_resources: Resource[];
  message: string;
};

export function StudentWellness(): JSX.Element {
  const qc = useQueryClient();
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
    },
  });

  const phqOptions = [
    { v: 0, label: 'Not at all' },
    { v: 1, label: 'Several days' },
    { v: 2, label: 'More than half the days' },
    { v: 3, label: 'Nearly every day' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Wellness check-in</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Two quick questions about how you've felt over the last 2 weeks, plus a quick stress
          rating. Your responses go to our counseling team — confidentially.
        </p>
      </div>

      <div className="bg-surface border border-zinc-800 rounded-lg p-5 space-y-5">
        <Question label="Little interest or pleasure in doing things" value={phq2_q1} setValue={setQ1} options={phqOptions} />
        <Question label="Feeling down, depressed, or hopeless" value={phq2_q2} setValue={setQ2} options={phqOptions} />
        <div>
          <label className="block text-sm font-medium mb-2">
            How stressed do you feel right now? <span className="text-zinc-500">({stress}/10)</span>
          </label>
          <input
            type="range"
            min={0}
            max={10}
            value={stress}
            onChange={(e) => setStress(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Anything you'd like to share? (optional)</label>
          <textarea
            value={free}
            onChange={(e) => setFree(e.target.value)}
            rows={4}
            className="w-full bg-bg border border-zinc-800 rounded px-3 py-2 text-sm"
            placeholder="What's on your mind?"
          />
        </div>
        <button
          onClick={() => submit.mutate()}
          disabled={submit.isPending}
          className="w-full bg-accent text-white rounded py-2 text-sm font-medium disabled:opacity-50"
        >
          {submit.isPending ? 'Submitting…' : 'Submit check-in'}
        </button>
      </div>

      {result && (
        <div
          className={`bg-surface border rounded-lg p-5 ${
            result.checkin.risk_tier === 'crisis'
              ? 'border-danger'
              : result.checkin.risk_tier === 'high'
                ? 'border-warn'
                : 'border-zinc-800'
          }`}
        >
          <div className="text-sm font-medium mb-2">Thanks for checking in</div>
          <div className="text-sm text-zinc-300 whitespace-pre-wrap">{result.message}</div>
          {result.crisis_resources.length > 0 && (
            <div className="mt-4 space-y-2">
              {result.crisis_resources.map((r) => (
                <a
                  key={r.id}
                  href={r.url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="block bg-bg border border-zinc-800 rounded p-3 text-sm hover:border-accent"
                >
                  <div className="font-medium">{r.title}</div>
                  {r.body_md && <div className="text-xs text-zinc-500 mt-1">{r.body_md}</div>}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {crisis.data && crisis.data.items.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Need help right now?</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {crisis.data.items.map((r) => (
              <a
                key={r.id}
                href={r.url ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="block bg-surface border border-danger/40 rounded p-3 text-sm hover:bg-danger/5"
              >
                <div className="font-medium text-danger">{r.title}</div>
                {r.body_md && <div className="text-xs text-zinc-400 mt-1">{r.body_md}</div>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Question({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  options: Array<{ v: number; label: string }>;
}): JSX.Element {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {options.map((o) => (
          <button
            type="button"
            key={o.v}
            onClick={() => setValue(o.v)}
            className={`text-xs px-2 py-2 rounded border ${
              value === o.v
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-zinc-800 text-zinc-300 hover:border-zinc-700'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
