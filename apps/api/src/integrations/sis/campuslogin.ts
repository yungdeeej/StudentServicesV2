import type {
  ISisAdapter,
  SisAttendance,
  SisGrade,
  SisStudent,
  StudentStatus,
} from '../types.js';
import { loadEnv } from '../../core/config/env.js';

const STATUSES: StudentStatus[] = [
  'start',
  'stay',
  'at_risk',
  'withdrawn',
  'on_practicum',
  'graduated',
  're_entry',
  'alumni',
];

export class CampusLoginMockAdapter implements ISisAdapter {
  private fixtures: SisStudent[] = Array.from({ length: 5 }).map((_, i) => ({
    external_id: `CL-${1000 + i}`,
    source: 'campuslogin',
    first_name: `Mock${i}`,
    last_name: 'Student',
    email: `mock${i}@example.com`,
    phone: '+15875550100',
    dob: '2000-01-01',
    program_external_id: 'PROG-MA',
    campus_external_id: 'CAM-CGY',
    entity_external_id: 'ENT-MCG',
    intake_date: new Date().toISOString().slice(0, 10),
    expected_graduation_date: null,
    practicum_start_date: null,
    status: STATUSES[i % STATUSES.length] ?? 'start',
    custom: {},
  }));

  async health(): Promise<{ ok: boolean; latency_ms: number }> {
    return { ok: true, latency_ms: 1 };
  }

  async listStudents(args: { since?: string; campus_id?: string }): Promise<SisStudent[]> {
    void args;
    return this.fixtures;
  }

  async getStudent(externalId: string): Promise<SisStudent | null> {
    return this.fixtures.find((s) => s.external_id === externalId) ?? null;
  }

  async listAttendance(_args: { since: string }): Promise<SisAttendance[]> {
    return [];
  }

  async listGrades(_args: { since: string }): Promise<SisGrade[]> {
    return [];
  }
}

export class CampusLoginHttpAdapter implements ISisAdapter {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    const env = loadEnv();
    this.baseUrl = env.CAMPUSLOGIN_BASE_URL ?? '';
    this.apiKey = env.CAMPUSLOGIN_API_KEY ?? '';
  }

  async health(): Promise<{ ok: boolean; latency_ms: number; detail?: string }> {
    const start = Date.now();
    if (!this.baseUrl) return { ok: false, latency_ms: 0, detail: 'CAMPUSLOGIN_BASE_URL unset' };
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return { ok: res.ok, latency_ms: Date.now() - start };
    } catch (err) {
      return { ok: false, latency_ms: Date.now() - start, detail: (err as Error).message };
    }
  }

  async listStudents(args: { since?: string; campus_id?: string }): Promise<SisStudent[]> {
    const url = new URL(`${this.baseUrl}/students`);
    if (args.since) url.searchParams.set('since', args.since);
    if (args.campus_id) url.searchParams.set('campus_id', args.campus_id);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${this.apiKey}` } });
    if (!res.ok) throw new Error(`campuslogin.listStudents: ${res.status}`);
    return (await res.json()) as SisStudent[];
  }

  async getStudent(externalId: string): Promise<SisStudent | null> {
    const res = await fetch(`${this.baseUrl}/students/${externalId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`campuslogin.getStudent: ${res.status}`);
    return (await res.json()) as SisStudent;
  }

  async listAttendance(args: { since: string }): Promise<SisAttendance[]> {
    const res = await fetch(`${this.baseUrl}/attendance?since=${encodeURIComponent(args.since)}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`campuslogin.listAttendance: ${res.status}`);
    return (await res.json()) as SisAttendance[];
  }

  async listGrades(args: { since: string }): Promise<SisGrade[]> {
    const res = await fetch(`${this.baseUrl}/grades?since=${encodeURIComponent(args.since)}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`campuslogin.listGrades: ${res.status}`);
    return (await res.json()) as SisGrade[];
  }
}
