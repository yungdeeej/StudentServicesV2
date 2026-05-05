import type { IBbbAdapter, BbbAttendance, Health } from '../types.js';
import { loadEnv } from '../../core/config/env.js';
import { createHash } from 'node:crypto';

export class BbbMockAdapter implements IBbbAdapter {
  async health(): Promise<Health> {
    return { ok: true, latency_ms: 1, detail: 'mock' };
  }
  async fetchAttendanceSince(_args: { since: string }): Promise<BbbAttendance[]> {
    return [];
  }
  async recordingUrl(_meeting_id: string): Promise<string | null> {
    return null;
  }
}

export class BbbHttpAdapter implements IBbbAdapter {
  private baseUrl: string;
  private secret: string;
  constructor() {
    const env = loadEnv();
    this.baseUrl = env.BBB_BASE_URL ?? '';
    this.secret = env.BBB_SHARED_SECRET ?? '';
  }
  private signedUrl(action: string, params: URLSearchParams): string {
    const query = params.toString();
    const checksum = createHash('sha1')
      .update(`${action}${query}${this.secret}`)
      .digest('hex');
    params.set('checksum', checksum);
    return `${this.baseUrl}/bigbluebutton/api/${action}?${params.toString()}`;
  }
  async health(): Promise<Health> {
    if (!this.baseUrl) return { ok: false, latency_ms: 0, detail: 'BBB_BASE_URL unset' };
    const start = Date.now();
    const url = this.signedUrl('getMeetings', new URLSearchParams());
    try {
      const res = await fetch(url);
      return { ok: res.ok, latency_ms: Date.now() - start };
    } catch (err) {
      return { ok: false, latency_ms: Date.now() - start, detail: (err as Error).message };
    }
  }
  async fetchAttendanceSince(_args: { since: string }): Promise<BbbAttendance[]> {
    // Real impl combines getRecordings + meeting webhooks; out of scope here.
    return [];
  }
  async recordingUrl(meeting_id: string): Promise<string | null> {
    const params = new URLSearchParams({ meetingID: meeting_id });
    const url = this.signedUrl('getRecordings', params);
    const res = await fetch(url);
    if (!res.ok) return null;
    return url;
  }
}
