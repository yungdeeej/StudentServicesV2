import { prisma } from '../../core/db/prisma.js';
import { emit, on, EVENT_TYPES } from '../../core/events/bus.js';
import { logger } from '../../core/logger.js';

const TIMELINE_STEPS = [
  { key: 'intro_student_services', offset_days: 0, label: 'Intro to Student Services' },
  { key: 'connect_room_assignment', offset_days: 7, label: 'Assign Connect Room + Student Leaders' },
  { key: 'stay_email_newsletter_1', offset_days: 30, label: 'Stay Email + Newsletter #1' },
  { key: 'newsletter_2', offset_days: 60, label: 'Newsletter #2' },
  { key: 'newsletter_3', offset_days: 90, label: 'Newsletter #3' },
] as const;

export function registerEngagementTimeline(): void {
  on(EVENT_TYPES.StudentCreated, async (event) => {
    if (!event.student_id) return;
    const intake = (event.payload as { intake_date: string }).intake_date;
    const intakeDate = new Date(intake);
    for (const step of TIMELINE_STEPS) {
      const scheduledAt = new Date(intakeDate);
      scheduledAt.setDate(scheduledAt.getDate() + step.offset_days);
      await prisma.studentTimelineProgress.upsert({
        where: { student_id_step_key: { student_id: event.student_id, step_key: step.key } },
        update: { scheduled_at: scheduledAt },
        create: { student_id: event.student_id, step_key: step.key, scheduled_at: scheduledAt },
      });
    }
  });
}

export async function runDueTimelineSteps(now: Date = new Date()): Promise<number> {
  const due = await prisma.studentTimelineProgress.findMany({
    where: { completed_at: null, scheduled_at: { lte: now } },
    take: 500,
    include: { student: { select: { id: true, workflows_paused: true, status: true } } },
  });
  let executed = 0;
  for (const row of due) {
    if (row.student.workflows_paused) continue;
    if (row.student.status === 'withdrawn' || row.student.status === 'graduated') continue;
    await executeStep(row.student_id, row.step_key);
    await prisma.studentTimelineProgress.update({
      where: { id: row.id },
      data: { completed_at: new Date() },
    });
    executed++;
  }
  if (executed > 0) logger.info({ executed }, 'engagement.timeline_steps_executed');
  return executed;
}

async function executeStep(student_id: string, step_key: string): Promise<void> {
  switch (step_key) {
    case 'intro_student_services':
      await emit({
        event_type: EVENT_TYPES.NewsletterSent,
        student_id,
        payload: { newsletter_id: 'intro_v1', subject: 'Intro to Student Services' },
      });
      break;
    case 'connect_room_assignment': {
      // Assign first available connect room for this campus
      const student = await prisma.student.findUnique({ where: { id: student_id } });
      if (!student) return;
      const room = await prisma.connectRoom.findFirst({ where: { campus_id: student.campus_id } });
      if (room) {
        await prisma.connectRoomAssignment.create({
          data: { student_id, connect_room_id: room.id },
        });
        await emit({
          event_type: EVENT_TYPES.ConnectRoomAssigned,
          student_id,
          payload: { connect_room_id: room.id },
        });
      }
      break;
    }
    case 'stay_email_newsletter_1':
    case 'newsletter_2':
    case 'newsletter_3':
      await emit({
        event_type: EVENT_TYPES.NewsletterSent,
        student_id,
        payload: { newsletter_id: step_key, subject: prettySubject(step_key) },
      });
      break;
  }
}

function prettySubject(step_key: string): string {
  if (step_key === 'stay_email_newsletter_1') return 'Stay Email + Newsletter #1';
  if (step_key === 'newsletter_2') return 'Newsletter #2';
  return 'Newsletter #3';
}
