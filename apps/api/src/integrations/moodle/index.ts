import type { IMoodleAdapter, MoodleActivity, Health } from '../types.js';
import { loadEnv } from '../../core/config/env.js';

export class MoodleMockAdapter implements IMoodleAdapter {
  async health(): Promise<Health> {
    return { ok: true, latency_ms: 1, detail: 'mock' };
  }
  async enrollStudent(_args: {
    student_external_id: string;
    course_external_ids: string[];
  }): Promise<{ enrolled_at: string }> {
    return { enrolled_at: new Date().toISOString() };
  }
  async listActivity(_args: { since: string }): Promise<MoodleActivity[]> {
    return [];
  }
}

export class MoodleHttpAdapter implements IMoodleAdapter {
  private baseUrl: string;
  private token: string;
  constructor() {
    const env = loadEnv();
    this.baseUrl = env.MOODLE_BASE_URL ?? '';
    this.token = env.MOODLE_TOKEN ?? '';
  }
  async health(): Promise<Health> {
    if (!this.baseUrl) return { ok: false, latency_ms: 0, detail: 'MOODLE_BASE_URL unset' };
    const start = Date.now();
    try {
      const res = await fetch(
        `${this.baseUrl}/webservice/rest/server.php?wsfunction=core_webservice_get_site_info&moodlewsrestformat=json&wstoken=${this.token}`,
      );
      return { ok: res.ok, latency_ms: Date.now() - start };
    } catch (err) {
      return { ok: false, latency_ms: Date.now() - start, detail: (err as Error).message };
    }
  }
  async enrollStudent(args: {
    student_external_id: string;
    course_external_ids: string[];
  }): Promise<{ enrolled_at: string }> {
    // Real impl uses enrol_manual_enrol_users; we POST per course.
    for (const courseId of args.course_external_ids) {
      const url = `${this.baseUrl}/webservice/rest/server.php?wsfunction=enrol_manual_enrol_users&moodlewsrestformat=json&wstoken=${this.token}`;
      const body = new URLSearchParams({
        'enrolments[0][roleid]': '5',
        'enrolments[0][userid]': args.student_external_id,
        'enrolments[0][courseid]': courseId,
      });
      const res = await fetch(url, { method: 'POST', body });
      if (!res.ok) throw new Error(`moodle.enroll: ${res.status}`);
    }
    return { enrolled_at: new Date().toISOString() };
  }
  async listActivity(args: { since: string }): Promise<MoodleActivity[]> {
    void args;
    // Real impl pulls from core_completion_get_activities_completion_status per user.
    // Phase 3 work.
    return [];
  }
}
