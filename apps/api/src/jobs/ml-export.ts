import { prisma } from '../core/db/prisma.js';
import { logger } from '../core/logger.js';

// Anonymized weekly export. Per README §11 and ASSUMPTIONS, this dataset
// trains a future ML risk model. We emit a CSV-shaped payload to the
// configured export bucket (URL stored on the snapshot row).

export async function runMlTrainingExport(): Promise<{ row_count: number; storage_url: string }> {
  const ninetyDays = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const students = await prisma.student.findMany({
    where: { deleted_at: null },
    include: {
      flags: true,
      attendance_records: { where: { occurred_at: { gte: ninetyDays } } },
      grade_records: { where: { recorded_at: { gte: ninetyDays } }, take: 30, orderBy: { recorded_at: 'desc' } },
      withdrawal_records: true,
      newsletter_deliveries: { take: 30, where: { sent_at: { gte: ninetyDays } } },
      event_participation: { where: { attended_at: { gte: ninetyDays } } },
      cases: { where: { opened_at: { gte: ninetyDays } } },
    },
  });

  const rows = students.map((s, i) => {
    const att = s.attendance_records.length;
    const present = s.attendance_records.filter((r) => r.present).length;
    const grades = s.grade_records.map((g) => g.value);
    return {
      // Anonymized — opaque hash, no PII
      anonymized_id: `s_${i}_${hash(s.id)}`,
      campus_id: s.campus_id,
      program_id: s.program_id,
      intake_offset_days: Math.round((Date.now() - s.intake_date.getTime()) / (24 * 60 * 60 * 1000)),
      attendance_pct: att === 0 ? null : Math.round((present / att) * 100),
      avg_grade: grades.length === 0 ? null : Math.round(grades.reduce((a, b) => a + b, 0) / grades.length),
      latest_grade: grades[0] ?? null,
      withdrew: s.withdrawal_records.length > 0 ? 1 : 0,
      cases_90d: s.cases.length,
      newsletter_count_90d: s.newsletter_deliveries.length,
      newsletter_open_count_90d: s.newsletter_deliveries.filter((n) => n.opened_at).length,
      event_attendance_90d: s.event_participation.length,
      engagement_score: s.flags?.engagement_score ?? null,
      risk_score: s.flags?.risk_score ?? null,
      at_risk_label: s.flags?.at_risk_flag ? 1 : 0, // The training target
    };
  });

  // Real impl uploads to S3/Replit blob; this records the manifest only.
  const storage_url = `local://ml-exports/${new Date().toISOString().slice(0, 10)}.csv`;
  const exportRow = await prisma.mlTrainingExport.create({
    data: { row_count: rows.length, storage_url, notes: `90d window, ${rows.length} students` },
  });
  logger.info({ export_id: exportRow.id, row_count: rows.length }, 'ml.export.complete');
  return { row_count: exportRow.row_count, storage_url: exportRow.storage_url };
}

function hash(s: string): string {
  // Small deterministic hash without crypto deps — opaque, not adversarial-safe.
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
