import { z } from 'zod';

export const StudentStatus = z.enum([
  'start',
  'stay',
  'at_risk',
  'withdrawn',
  'on_practicum',
  'graduated',
  're_entry',
  'alumni',
]);
export type StudentStatus = z.infer<typeof StudentStatus>;

export const SisSource = z.enum(['campuslogin', 'salesforce']);
export type SisSource = z.infer<typeof SisSource>;

export const SisStudent = z.object({
  external_id: z.string().min(1),
  source: SisSource,
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  dob: z.string(),
  program_external_id: z.string(),
  campus_external_id: z.string(),
  entity_external_id: z.string(),
  intake_date: z.string(),
  expected_graduation_date: z.string().nullable(),
  practicum_start_date: z.string().nullable(),
  status: StudentStatus,
  custom: z.record(z.unknown()).default({}),
});
export type SisStudent = z.infer<typeof SisStudent>;

export const SisAttendance = z.object({
  student_external_id: z.string(),
  session_id: z.string(),
  occurred_at: z.string(),
  present: z.boolean(),
});
export type SisAttendance = z.infer<typeof SisAttendance>;

export const SisGrade = z.object({
  student_external_id: z.string(),
  course_external_id: z.string(),
  assessment_id: z.string(),
  value: z.number(),
  recorded_at: z.string(),
});
export type SisGrade = z.infer<typeof SisGrade>;

export interface ISisAdapter {
  health(): Promise<{ ok: boolean; latency_ms: number }>;
  listStudents(args: { since?: string; campus_id?: string }): Promise<SisStudent[]>;
  getStudent(externalId: string): Promise<SisStudent | null>;
  listAttendance(args: { since: string }): Promise<SisAttendance[]>;
  listGrades(args: { since: string }): Promise<SisGrade[]>;
  upsertStudent?(student: Partial<SisStudent> & { external_id: string }): Promise<void>;
  recordStatusChange?(externalId: string, status: StudentStatus): Promise<void>;
}
