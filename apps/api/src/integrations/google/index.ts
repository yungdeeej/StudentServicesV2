import { randomUUID } from 'node:crypto';
import type { Health, IGoogleAdapter } from '../types.js';

export class GoogleMockAdapter implements IGoogleAdapter {
  async health(): Promise<Health> {
    return { ok: true, latency_ms: 1, detail: 'mock' };
  }
  async createCalendarEvent(args: {
    summary: string;
    start: string;
    end: string;
    attendees: string[];
  }): Promise<{ event_id: string; html_link: string }> {
    void args;
    const id = randomUUID();
    return { event_id: id, html_link: `https://calendar.google.com/event?eid=${id}` };
  }
  async sendEmail(args: { to: string; subject: string; body: string }): Promise<{ message_id: string }> {
    void args;
    return { message_id: `mock-msg-${randomUUID()}` };
  }
}

export class GoogleHttpAdapter extends GoogleMockAdapter {
  // Skeleton — wire when service account JSON + scopes are confirmed.
}
