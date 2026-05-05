import type { Health, IFalAdapter } from '../types.js';

export class FalMockAdapter implements IFalAdapter {
  async health(): Promise<Health> {
    return { ok: true, latency_ms: 1, detail: 'mock' };
  }
  async generateImage(args: { prompt: string; size?: string }): Promise<{ url: string }> {
    void args;
    return { url: 'https://placehold.co/1200x600?text=MCG+Newsletter' };
  }
}

export class FalHttpAdapter extends FalMockAdapter {
  // Skeleton — only invoke when AI visual generation surfaces.
}
