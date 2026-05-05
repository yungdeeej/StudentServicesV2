import { prisma } from '../core/db/prisma.js';
import { emit, EVENT_TYPES } from '../core/events/bus.js';
import { logger } from '../core/logger.js';

const STAFF_ROLES = ['rep', 'coordinator', 'manager', 'counselor', 'tutor'] as const;
const BURNOUT_FLAG_THRESHOLD = 70;

export async function snapshotWorkload(now: Date = new Date()): Promise<number> {
  const staff = await prisma.user.findMany({
    where: { is_active: true, role: { in: STAFF_ROLES as never } },
  });
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  let alerts = 0;

  for (const user of staff) {
    const [openCases, openTasks, openInterventions, upcomingAppts] = await Promise.all([
      prisma.case.count({ where: { assignee_id: user.id, status: { not: 'closed' } } }),
      prisma.task.count({
        where: { owner_user_id: user.id, status: { in: ['open', 'in_progress'] } },
      }),
      prisma.intervention.count({
        where: { owner_id: user.id, status: { in: ['assigned', 'in_progress'] } },
      }),
      prisma.appointment.count({
        where: {
          staff_user_id: user.id,
          scheduled_at: { gte: now, lt: sevenDays },
          status: { notIn: ['cancelled', 'no_show'] },
        },
      }),
    ]);

    const burnout =
      Math.min(40, openCases * 4) +
      Math.min(30, openTasks * 2) +
      Math.min(20, openInterventions * 4) +
      Math.min(20, upcomingAppts * 1);
    const flagged = burnout >= BURNOUT_FLAG_THRESHOLD;

    await prisma.staffWorkloadSnapshot.create({
      data: {
        user_id: user.id,
        captured_at: now,
        open_cases: openCases,
        open_tasks: openTasks,
        open_interventions: openInterventions,
        appointments_next_7d: upcomingAppts,
        burnout_score: burnout,
        flagged,
      },
    });

    if (flagged) {
      alerts++;
      await emit({
        event_type: EVENT_TYPES.StaffWorkloadAlert,
        student_id: null,
        payload: {
          user_id: user.id,
          burnout_score: burnout,
          open_cases: openCases,
          open_tasks: openTasks,
        },
      });
      // Surface as a manager-targeted task
      const manager = await prisma.user.findFirst({ where: { role: 'manager', is_active: true } });
      await emit({
        event_type: EVENT_TYPES.TaskCreated,
        student_id: null,
        payload: {
          title: `Workload review: ${user.first_name} ${user.last_name} (score ${burnout})`,
          description: `Open cases ${openCases}, tasks ${openTasks}, interventions ${openInterventions}. Consider redistributing.`,
          owner_user_id: manager?.id,
          priority: 'high',
        },
      });
    }
  }
  if (alerts > 0) logger.warn({ alerts }, 'workload.alerts');
  return staff.length;
}
