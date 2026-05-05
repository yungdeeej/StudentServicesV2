import { prisma } from '../core/db/prisma.js';
import { getIntegrations } from '../integrations/factory.js';
import { logger } from '../core/logger.js';
import { emit, EVENT_TYPES } from '../core/events/bus.js';

const STATE_KEY = 'sis-sync';

async function getCursor(): Promise<{ last_synced_at: Date | null }> {
  // Tiny, single-row state stored in EngagementScoreConfig.id-style table
  // would be overkill; we stash it in EventStore as a system event.
  const row = await prisma.eventStore.findFirst({
    where: { event_type: 'system.sis_sync.cursor' },
    orderBy: { occurred_at: 'desc' },
  });
  if (!row) return { last_synced_at: null };
  const payload = row.payload as { last_synced_at?: string };
  return { last_synced_at: payload.last_synced_at ? new Date(payload.last_synced_at) : null };
}

async function saveCursor(at: Date): Promise<void> {
  await emit({
    event_type: 'system.sis_sync.cursor' as never,
    student_id: null,
    payload: { last_synced_at: at.toISOString() },
  });
}

export async function syncSisOnce(): Promise<number> {
  const integrations = getIntegrations();
  const cursor = await getCursor();
  const since = cursor.last_synced_at?.toISOString();
  let count = 0;

  // Students
  const students = await integrations.sis.listStudents(since ? { since } : {});
  for (const s of students) {
    const program = await prisma.program.findUnique({ where: { external_id: s.program_external_id } });
    const campus = await prisma.campus.findUnique({ where: { external_id: s.campus_external_id } });
    const entity = await prisma.entity.findUnique({ where: { external_id: s.entity_external_id } });
    if (!program || !campus || !entity) {
      logger.warn({ s }, 'sis.skipped_unknown_org_refs');
      continue;
    }
    const existing = await prisma.student.findUnique({
      where: { student_external_id: s.external_id },
    });
    if (existing) continue;
    const created = await prisma.student.create({
      data: {
        student_external_id: s.external_id,
        sis_source: s.source,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        phone: s.phone,
        dob: new Date(s.dob),
        program_id: program.id,
        campus_id: campus.id,
        entity_id: entity.id,
        intake_date: new Date(s.intake_date),
        expected_graduation_date: s.expected_graduation_date
          ? new Date(s.expected_graduation_date)
          : null,
        status: s.status,
        flags: { create: {} },
      },
    });
    count++;
    await emit({
      event_type: EVENT_TYPES.StudentCreated,
      student_id: created.id,
      payload: {
        student_external_id: created.student_external_id,
        sis_source: created.sis_source,
        campus_id: created.campus_id,
        entity_id: created.entity_id,
        program_id: created.program_id,
        intake_date: created.intake_date.toISOString(),
      },
    });
  }

  // Attendance
  if (since) {
    const attendance = await integrations.sis.listAttendance({ since });
    for (const row of attendance) {
      const student = await prisma.student.findUnique({
        where: { student_external_id: row.student_external_id },
      });
      if (!student) continue;
      await prisma.attendanceRecord.create({
        data: {
          student_id: student.id,
          source: 'manual',
          session_id: row.session_id,
          occurred_at: new Date(row.occurred_at),
          present: row.present,
        },
      });
      await emit({
        event_type: row.present ? EVENT_TYPES.AttendanceRecorded : EVENT_TYPES.AttendanceMissing,
        student_id: student.id,
        payload: { source: 'manual', session_id: row.session_id, present: row.present },
      });
    }
  }

  // Grades
  if (since) {
    const grades = await integrations.sis.listGrades({ since });
    for (const row of grades) {
      const student = await prisma.student.findUnique({
        where: { student_external_id: row.student_external_id },
        include: { program: true },
      });
      if (!student) continue;
      const threshold = student.program.passing_grade;
      await prisma.gradeRecord.create({
        data: {
          student_id: student.id,
          course_external_id: row.course_external_id,
          assessment_id: row.assessment_id,
          value: row.value,
          threshold,
          recorded_at: new Date(row.recorded_at),
        },
      });
      await emit({
        event_type: EVENT_TYPES.GradeRecorded,
        student_id: student.id,
        payload: { course_id: row.course_external_id, assessment_id: row.assessment_id, value: row.value, threshold },
      });
      if (row.value < threshold) {
        await emit({
          event_type: EVENT_TYPES.GradeBelowThreshold,
          student_id: student.id,
          payload: { value: row.value, threshold },
        });
      }
    }
  }

  await saveCursor(new Date());
  if (count > 0) logger.info({ count }, 'sis.sync.created_students');
  return count;
}
