import type { Health, IJustCallAdapter, JustCallEvent } from '../types.js';

export class JustCallMockAdapter implements IJustCallAdapter {
  async health(): Promise<Health> {
    return { ok: true, latency_ms: 1, detail: 'mock' };
  }
  async fetchCallEventsSince(_since: string): Promise<JustCallEvent[]> {
    return [];
  }
}

export class JustCallHttpAdapter extends JustCallMockAdapter {
  // Skeleton — see docs/INTEGRATIONS.md for required scopes.
}
