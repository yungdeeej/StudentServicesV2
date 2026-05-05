type Listener = () => void;

const ACCESS_KEY = 'mcg.access_token';
const REFRESH_KEY = 'mcg.refresh_token';
const USER_KEY = 'mcg.user';

const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) l();
}

export const auth = {
  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem(ACCESS_KEY));
  },
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  getUser(): { id: string; email: string; role: string; first_name: string; last_name: string } | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as ReturnType<typeof auth.getUser>) : null;
  },
  async login(email: string, password: string): Promise<void> {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('invalid_credentials');
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      user: { id: string; email: string; role: string; first_name: string; last_name: string };
    };
    localStorage.setItem(ACCESS_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    notify();
  },
  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    notify();
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
