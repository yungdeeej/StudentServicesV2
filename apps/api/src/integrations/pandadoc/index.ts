import { randomUUID } from 'node:crypto';
import type { Health, IPandaDocAdapter } from '../types.js';

export class PandaDocMockAdapter implements IPandaDocAdapter {
  async health(): Promise<Health> {
    return { ok: true, latency_ms: 1, detail: 'mock' };
  }
  async createDocument(_args: {
    template: string;
    recipient_email: string;
    vars: Record<string, string>;
  }): Promise<{ external_id: string; status: string }> {
    return { external_id: `mock-doc-${randomUUID()}`, status: 'document.draft' };
  }
  async getDocumentStatus(_external_id: string): Promise<{ status: string }> {
    return { status: 'document.completed' };
  }
}

export class PandaDocHttpAdapter extends PandaDocMockAdapter {
  // Skeleton — wire when MCG provides API key + final templates.
}
