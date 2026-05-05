import { randomUUID } from 'node:crypto';
import type { Health, ITwilioAdapter } from '../types.js';
import { loadEnv } from '../../core/config/env.js';

export class TwilioMockAdapter implements ITwilioAdapter {
  async health(): Promise<Health> {
    return { ok: true, latency_ms: 1, detail: 'mock' };
  }
  async sendSms(_args: { to: string; body: string }): Promise<{ external_id: string }> {
    return { external_id: `mock-sms-${randomUUID()}` };
  }
}

export class TwilioHttpAdapter implements ITwilioAdapter {
  private accountSid: string;
  private authToken: string;
  private from: string;
  constructor() {
    const env = loadEnv();
    this.accountSid = env.TWILIO_ACCOUNT_SID ?? '';
    this.authToken = env.TWILIO_AUTH_TOKEN ?? '';
    this.from = env.TWILIO_FROM_NUMBER ?? '';
  }
  async health(): Promise<Health> {
    if (!this.accountSid) return { ok: false, latency_ms: 0, detail: 'TWILIO_ACCOUNT_SID unset' };
    const start = Date.now();
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    try {
      const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
      return { ok: res.ok, latency_ms: Date.now() - start };
    } catch (err) {
      return { ok: false, latency_ms: Date.now() - start, detail: (err as Error).message };
    }
  }
  async sendSms(args: { to: string; body: string }): Promise<{ external_id: string }> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const body = new URLSearchParams({ To: args.to, From: this.from, Body: args.body });
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`twilio.sendSms: ${res.status}`);
    const data = (await res.json()) as { sid: string };
    return { external_id: data.sid };
  }
}
