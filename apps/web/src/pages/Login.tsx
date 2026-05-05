import { useState, type ReactNode } from 'react';
import { auth } from '../lib/auth.js';
import { Button } from '../components/ui/Button.js';
import { Field, Input } from '../components/ui/Input.js';
import { Icon } from '../components/ui/Icon.js';

const DEMO_ACCOUNTS = [
  { label: 'Student', email: 'student0@mcg.example', desc: 'Self-service portal' },
  { label: 'Coordinator', email: 'coordinator@mcg.example', desc: 'Cases, interventions' },
  { label: 'Counselor', email: 'counselor@mcg.example', desc: 'Wellness triage' },
  { label: 'Admin', email: 'admin@mcg.example', desc: 'Full access' },
];

export function Login({ onSuccess }: { onSuccess: () => void }): JSX.Element {
  const [email, setEmail] = useState('admin@mcg.example');
  const [password, setPassword] = useState('changeme123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await auth.login(email, password);
      onSuccess();
    } catch {
      setError('Invalid email or password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg text-ink">
      <div className="hidden lg:flex flex-col justify-between p-10 gradient-hero relative overflow-hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-violet-500 grid place-items-center font-bold text-white text-lg">
            M
          </div>
          <div className="text-lg font-semibold">MCG Career College</div>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight mb-3">
            Everything you need to thrive at MCG.
          </h2>
          <p className="text-sm text-zinc-400">
            Track your progress, talk to your team, book a study room, request tutoring, or check
            in on how you're feeling — all in one place.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-zinc-300">
            <Bullet>Self-service for grades, attendance, courses</Bullet>
            <Bullet>Direct messaging with your support team</Bullet>
            <Bullet>Confidential wellness check-ins, 24/7 crisis resources</Bullet>
            <Bullet>Tutoring, study groups, and bookable spaces</Bullet>
          </ul>
        </div>
        <div className="text-xs text-muted">© MCG Career College</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-400 to-violet-500 grid place-items-center font-bold text-white">
              M
            </div>
            <div className="font-semibold">MCG Portal</div>
          </div>
          <h1 className="text-2xl font-semibold mb-1">Welcome back</h1>
          <p className="text-sm text-muted mb-6">Sign in to continue.</p>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@mcg.example"
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </Field>
            {error && (
              <div className="flex items-start gap-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg p-3">
                <Icon name="alert" size={16} className="mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <Button type="submit" loading={busy} className="w-full" size="lg">
              Sign in
            </Button>
          </form>

          <div className="mt-8">
            <div className="text-[11px] uppercase tracking-widest text-muted mb-3">Demo accounts</div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword('changeme123');
                  }}
                  className="text-left bg-surface border border-border rounded-lg p-3 hover:border-border-strong transition"
                >
                  <div className="text-xs font-medium">{a.label}</div>
                  <div className="text-[10px] text-muted truncate">{a.desc}</div>
                </button>
              ))}
            </div>
            <div className="text-[11px] text-muted mt-2">
              Password for all demo accounts:{' '}
              <span className="text-zinc-300 font-mono">changeme123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: ReactNode }): JSX.Element {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
      <span>{children}</span>
    </li>
  );
}
