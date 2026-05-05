import type {
  ISisAdapter,
  SisAttendance,
  SisGrade,
  SisStudent,
} from '../types.js';

// Skeleton — full implementation in Phase 6 once MCG IT confirms object model.
// See docs/SIS_MIGRATION.md for the field-mapping plan.
export class SalesforceMockAdapter implements ISisAdapter {
  async health(): Promise<{ ok: boolean; latency_ms: number; detail?: string }> {
    return { ok: true, latency_ms: 1, detail: 'salesforce mock' };
  }
  async listStudents(): Promise<SisStudent[]> {
    return [];
  }
  async getStudent(): Promise<SisStudent | null> {
    return null;
  }
  async listAttendance(): Promise<SisAttendance[]> {
    return [];
  }
  async listGrades(): Promise<SisGrade[]> {
    return [];
  }
}

export class SalesforceHttpAdapter extends SalesforceMockAdapter {
  // Intentional inherit: skeleton until OAuth + object model are confirmed.
}
