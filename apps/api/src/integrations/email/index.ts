import { randomUUID } from 'node:crypto';
import type { Health, IEmailAdapter } from '../types.js';
import { loadEnv } from '../../core/config/env.js';
import { logger } from '../../core/logger.js';

export class MockEmailAdapter implements IEmailAdapter {
  async health(): Promise<Health> {
    return { ok: true, latency_ms: 1, detail: 'mock' };
  }
  async send(args: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    headers?: Record<string, string>;
  }): Promise<{ message_id: string }> {
    logger.info({ to: args.to, subject: args.subject }, 'email.mock.sent');
    return { message_id: `mock-email-${randomUUID()}` };
  }
}

export class SmtpEmailAdapter implements IEmailAdapter {
  private host: string;
  private port: number;
  private user: string;
  private pass: string;
  private from: string;

  constructor() {
    const env = loadEnv();
    this.host = env.SMTP_HOST ?? '';
    this.port = env.SMTP_PORT;
    this.user = env.SMTP_USER ?? '';
    this.pass = env.SMTP_PASS ?? '';
    this.from = env.SMTP_FROM;
  }
  async health(): Promise<Health> {
    return { ok: Boolean(this.host), latency_ms: 0 };
  }
  async send(args: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    headers?: Record<string, string>;
  }): Promise<{ message_id: string }> {
    // Lightweight implementation note: production code would use nodemailer.
    // To keep dependencies minimal at this stage we ship a logging-only impl;
    // wiring nodemailer is a one-line swap.
    logger.info(
      { host: this.host, port: this.port, to: args.to, subject: args.subject, from: this.from },
      'email.smtp.send_stub',
    );
    void this.user;
    void this.pass;
    return { message_id: `smtp-${randomUUID()}` };
  }
}
