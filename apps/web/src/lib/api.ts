import { auth } from './auth.js';

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = auth.getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    auth.logout();
    throw new Error('unauthenticated');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`api ${path} ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
