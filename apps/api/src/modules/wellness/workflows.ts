import { prisma } from '../../core/db/prisma.js';
import { emit, on, EVENT_TYPES } from '../../core/events/bus.js';
import { logger } from '../../core/logger.js';

export function registerWellnessWorkflows(): void {
  on(EVENT_TYPES.WellnessCrisisDetected, async (event) => {
    if (!event.student_id) return;
    const payload = event.payload as { checkin_id: string; risk_tier: string };

    // 1. Open a confidential case (wellness kind).
    const counselor = await prisma.user.findFirst({
      where: { role: 'counselor', is_active: true },
    });
    const c = await prisma.case.create({
      data: {
        student_id: event.student_id,
        reason: 'wellness_crisis',
        kind: 'wellness',
        confidential: true,
        assignee_id: counselor?.id,
      },
    });

    // 2. Spawn a high-priority task for the counselor team.
    await emit({
      event_type: EVENT_TYPES.TaskCreated,
      student_id: event.student_id,
      payload: {
        title: `URGENT — wellness check-in flagged ${payload.risk_tier}`,
        description: `Reach out within 1 hour. Case ${c.id}.`,
        owner_user_id: counselor?.id,
        priority: 'urgent',
        source_event_id: event.event_id,
      },
    });

    // 3. Open a confidential message thread with the student.
    const thread = await prisma.messageThread.create({
      data: {
        student_id: event.student_id,
        subject: 'Wellness check-in — we want to make sure you have support',
        confidential: true,
      },
    });
    if (counselor) {
      await prisma.message.create({
        data: {
          thread_id: thread.id,
          sender_user_id: counselor.id,
          body:
            "Hi, I'm reaching out because of your recent wellness check-in. I'd like to set up a quick conversation when you're ready — totally confidential. If you need immediate support, please use the crisis resources on your dashboard.",
        },
      });
      await prisma.messageThread.update({
        where: { id: thread.id },
        data: { last_message_at: new Date() },
      });
    }
    logger.info(
      { student_id: event.student_id, case_id: c.id, thread_id: thread.id },
      'wellness.crisis_handoff_completed',
    );
  });
}
