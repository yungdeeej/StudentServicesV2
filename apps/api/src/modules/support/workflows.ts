import { prisma } from '../../core/db/prisma.js';
import { emit, on, EVENT_TYPES } from '../../core/events/bus.js';

export function registerSupportWorkflows(): void {
  // Re-entry: when status flips back from withdrawn → active, create a 4-week plan.
  on(EVENT_TYPES.StudentStatusChanged, async (event) => {
    const p = event.payload as { from?: string; to?: string };
    if (!event.student_id) return;
    if (p.from === 'withdrawn' && (p.to === 'start' || p.to === 'stay' || p.to === 're_entry')) {
      const plan = await prisma.reentryPlan.create({
        data: { student_id: event.student_id, weeks_total: 4 },
      });
      const checks = Array.from({ length: 4 }).map((_, i) => {
        const due = new Date();
        due.setDate(due.getDate() + (i + 1) * 7);
        return prisma.reentryWeeklyCheck.create({
          data: { reentry_plan_id: plan.id, week_n: i + 1, scheduled_at: due },
        });
      });
      await Promise.all(checks);
      await prisma.studentFlags.upsert({
        where: { student_id: event.student_id },
        update: { re_entry_flag: true },
        create: { student_id: event.student_id, re_entry_flag: true },
      });
      await emit({
        event_type: EVENT_TYPES.ReentryInitiated,
        student_id: event.student_id,
        payload: { reentry_plan_id: plan.id },
      });
    }
  });

  on(EVENT_TYPES.AccommodationApproved, async (event) => {
    if (!event.student_id) return;
    const p = event.payload as { accommodation_id: string };
    await prisma.accommodationRequest.update({
      where: { id: p.accommodation_id },
      data: { status: 'active' },
    });
  });
}

export async function runReentryWeeklyChecks(now: Date = new Date()): Promise<number> {
  const due = await prisma.reentryWeeklyCheck.findMany({
    where: { completed_at: null, scheduled_at: { lte: now } },
    include: { plan: { include: { student: true } } },
    take: 200,
  });
  for (const check of due) {
    await emit({
      event_type: EVENT_TYPES.ReentryWeeklyCheck,
      student_id: check.plan.student_id,
      payload: { reentry_plan_id: check.reentry_plan_id, week_n: check.week_n, summary: 'auto-scheduled' },
    });
    await emit({
      event_type: EVENT_TYPES.TaskCreated,
      student_id: check.plan.student_id,
      payload: {
        title: `Re-entry weekly check (week ${check.week_n})`,
        priority: 'normal',
      },
    });
    await prisma.reentryWeeklyCheck.update({ where: { id: check.id }, data: { completed_at: new Date() } });
  }
  return due.length;
}
