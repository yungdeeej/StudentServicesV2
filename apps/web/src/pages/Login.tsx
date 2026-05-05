import { useState } from 'react';
import { auth } from '../lib/auth.js';

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
    <div className="min-h-screen flex items-center justify-center bg-bg text-zinc-100">
      <form
        onSubmit={submit}
        className="w-96 p-8 rounded-lg bg-surface border border-zinc-800 flex flex-col gap-4"
      >
        <h1 className="text-xl font-semibold">MCG Student Services</h1>
        <p className="text-sm text-zinc-500">Sign in to continue.</p>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-bg border border-zinc-800 rounded px-3 py-2 text-zinc-100"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-bg border border-zinc-800 rounded px-3 py-2 text-zinc-100"
            required
          />
        </label>
        {error && <div className="text-sm text-danger">{error}</div>}
        <button
          type="submit"
          disabled={busy}
          className="bg-accent text-white rounded py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
