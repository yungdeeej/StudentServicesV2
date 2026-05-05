import { prisma } from '../../core/db/prisma.js';
import { emit, on, EVENT_TYPES } from '../../core/events/bus.js';
import { logger } from '../../core/logger.js';
import { recomputeFlags } from '../../core/flags.js';

export function registerRiskWorkflows(): void {
  // Recompute on academic-signal events
  for (const t of [
    EVENT_TYPES.GradeRecorded,
    EVENT_TYPES.AttendanceRecorded,
    EVENT_TYPES.AttendanceMissing,
    EVENT_TYPES.WithdrawalInitiated,
  ]) {
    on(t, async (event) => {
      if (!event.student_id) return;
      await recomputeFlags(event.student_id);
    });
  }

  // On flag → open Case + assign default intervention + notify PC
  on(EVENT_TYPES.RiskFlagged, async (event) => {
    const studentId = event.student_id;
    if (!studentId) return;
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return;

    // Idempotency — don't reopen if a non-closed case exists.
    const existing = await prisma.case.findFirst({
      where: { student_id: studentId, status: { not: 'closed' } },
    });
    if (existing) return;

    const reason = (event.payload as { top_factors?: string[] })?.top_factors?.[0] ?? 'unknown';
    const c = await prisma.case.create({
      data: {
        student_id: studentId,
        reason,
        assignee_id: student.assigned_program_coordinator_id ?? undefined,
        status: 'open',
      },
    });
    await emit({
      event_type: EVENT_TYPES.CaseOpened,
      student_id: studentId,
      payload: { case_id: c.id, reason },
    });

    const interventionType =
      reason.includes('attendance') ? 'attendance' : reason.includes('grade') ? 'academic' : 'personal';
    const playbook = await prisma.interventionPlaybook.findFirst({
      where: { type: interventionType, active: true },
    });
    const intervention = await prisma.intervention.create({
      data: {
        student_id: studentId,
        case_id: c.id,
        type: interventionType,
        playbook_id: playbook?.id,
        owner_id: student.assigned_program_coordinator_id ?? undefined,
      },
    });
    await emit({
      event_type: EVENT_TYPES.InterventionAssigned,
      student_id: studentId,
      payload: { intervention_id: intervention.id, type: interventionType, playbook_id: playbook?.id },
    });

    if (student.assigned_program_coordinator_id) {
      await emit({
        event_type: EVENT_TYPES.TaskCreated,
        student_id: studentId,
        payload: {
          title: `At-risk: ${student.first_name} ${student.last_name}`,
          description: `Auto-opened case ${c.id} — primary factor: ${reason}.`,
          owner_user_id: student.assigned_program_coordinator_id,
          campus_id: student.campus_id,
          priority: 'high',
          source_event_id: event.event_id,
        },
      });
    }
    logger.info({ studentId, case_id: c.id }, 'risk.case_opened');
  });

  // On clear → close any open case
  on(EVENT_TYPES.RiskCleared, async (event) => {
    if (!event.student_id) return;
    const open = await prisma.case.findFirst({
      where: { student_id: event.student_id, status: { not: 'closed' } },
    });
    if (open) {
      await prisma.case.update({
        where: { id: open.id },
        data: { status: 'closed', closed_at: new Date(), resolution: 'auto-cleared' },
      });
      await emit({
        event_type: EVENT_TYPES.CaseClosed,
        student_id: event.student_id,
        payload: { case_id: open.id, resolution: 'auto-cleared' },
      });
    }
  });

  // Mark case action when a coordinator logs anything against the case
  on(EVENT_TYPES.CaseActionLogged, async (event) => {
    const p = event.payload as { case_id: string };
    await prisma.case.update({ where: { id: p.case_id }, data: { last_action_at: new Date() } });
  });
}

const FIVE_BUSINESS_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export async function runEscalationSweep(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - FIVE_BUSINESS_DAYS_MS);
  const stale = await prisma.case.findMany({
    where: {
      status: 'open',
      escalated_at: null,
      OR: [
        { last_action_at: null, opened_at: { lte: cutoff } },
        { last_action_at: { lte: cutoff } },
      ],
    },
    take: 500,
  });
  for (const c of stale) {
    await prisma.case.update({
      where: { id: c.id },
      data: { status: 'escalated', escalated_at: new Date() },
    });
    await emit({
      event_type: EVENT_TYPES.RiskEscalated,
      student_id: c.student_id,
      payload: { case_id: c.id, reason: c.reason, opened_at: c.opened_at.toISOString() },
    });
    await emit({
      event_type: EVENT_TYPES.TaskCreated,
      student_id: c.student_id,
      payload: {
        title: `Escalation: case ${c.id} stale > 5 business days`,
        priority: 'urgent',
        source_event_id: c.id,
      },
    });
  }
  return stale.length;
}
