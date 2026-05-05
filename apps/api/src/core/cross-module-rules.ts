import { prisma } from './db/prisma.js';
import { emit, on } from './events/bus.js';
import { EVENT_TYPES, type DomainEvent } from './events/types.js';
import { logger } from './logger.js';

export function registerCrossModuleRules(): void {
  // Status sync — withdrawn pauses workflows, graduated migrates to alumni.
  on(EVENT_TYPES.StudentStatusChanged, async (event) => {
    const { student_id } = event;
    if (!student_id) return;
    const payload = event.payload as { from?: string; to?: string };

    if (payload.to === 'withdrawn') {
      await prisma.student.update({
        where: { id: student_id },
        data: { workflows_paused: true },
      });
      logger.info({ student_id }, 'cross.workflows_paused');
    }
    if (payload.to === 'graduated') {
      await prisma.student.update({
        where: { id: student_id },
        data: { status: 'alumni', workflows_paused: true },
      });
      await emit({
        event_type: EVENT_TYPES.StudentGraduated,
        student_id,
        payload: { graduation_date: new Date().toISOString() },
      });
    }
  });

  // Universal task creation hook — handlers throughout the system call
  // emit('task.created') instead of inserting directly. We listen here and
  // persist into the `tasks` table.
  on(EVENT_TYPES.TaskCreated, async (event: DomainEvent<unknown>) => {
    const p = event.payload as {
      title: string;
      description?: string;
      owner_user_id?: string;
      campus_id?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      due_at?: string;
      source_event_id?: string;
    };
    await prisma.task.create({
      data: {
        title: p.title,
        description: p.description,
        owner_user_id: p.owner_user_id,
        student_id: event.student_id ?? undefined,
        campus_id: p.campus_id,
        priority: p.priority ?? 'normal',
        due_at: p.due_at ? new Date(p.due_at) : undefined,
        source_event_id: p.source_event_id,
      },
    });
  });

  // Universal communication.logged → communications table.
  on(EVENT_TYPES.CommunicationLogged, async (event) => {
    const p = event.payload as {
      direction: 'inbound' | 'outbound';
      channel: 'email' | 'sms' | 'call' | 'voicemail';
      from_address: string;
      to_address: string;
      subject?: string;
      body_or_summary: string;
      external_id?: string;
      attachments_url?: string;
    };
    await prisma.communication.create({
      data: {
        student_id: event.student_id ?? undefined,
        direction: p.direction,
        channel: p.channel,
        from_address: p.from_address,
        to_address: p.to_address,
        subject: p.subject,
        body_or_summary: p.body_or_summary,
        external_id: p.external_id,
        attachments_url: p.attachments_url,
      },
    });
  });
}
