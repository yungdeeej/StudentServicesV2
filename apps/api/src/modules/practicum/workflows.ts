import { prisma } from '../../core/db/prisma.js';
import { emit, on, EVENT_TYPES } from '../../core/events/bus.js';

export function registerPracticumWorkflows(): void {
  on(EVENT_TYPES.PracticumStarted, async (event) => {
    if (!event.student_id) return;
    await prisma.student.update({
      where: { id: event.student_id },
      data: { status: 'on_practicum' },
    });
    await emit({
      event_type: EVENT_TYPES.StudentStatusChanged,
      student_id: event.student_id,
      payload: { from: 'stay', to: 'on_practicum' },
    });
  });
}

export async function recomputePracticumFlags(student_id: string): Promise<void> {
  const placement = await prisma.practicumPlacement.findFirst({
    where: { student_id, status: 'active' },
    include: { hours_logs: true },
  });
  const flags = await prisma.studentFlags.findUnique({ where: { student_id } });
  const totalHours = placement?.hours_logs.reduce((acc, log) => acc + (log.approved ? log.hours : 0), 0) ?? 0;
  const completed_hours_flag = placement ? totalHours >= placement.hours_target : false;

  const student = await prisma.student.findUnique({
    where: { id: student_id },
    include: { cases: { where: { status: { not: 'closed' } } } },
  });
  const noOpenCriticalCase = !(student?.cases ?? []).some((c) => c.status === 'escalated');
  const goodStatus = student?.status !== 'at_risk' && student?.status !== 'withdrawn';
  const practicum_ready_flag = completed_hours_flag && goodStatus && noOpenCriticalCase;

  await prisma.studentFlags.upsert({
    where: { student_id },
    update: { completed_hours_flag, practicum_ready_flag },
    create: { student_id, completed_hours_flag, practicum_ready_flag },
  });
  void flags;
}
