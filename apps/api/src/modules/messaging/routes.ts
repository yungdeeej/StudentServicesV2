import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { audit } from '../../core/audit.js';
import { emit, EVENT_TYPES } from '../../core/events/bus.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';
import { als } from '../../core/async-context.js';
import { roleHasCapability } from '../../core/rbac/capabilities.js';

export const messagingRouter: Router = Router();
messagingRouter.use(requireAuth);

// Both staff and students hit this. Permission gating differs:
// - Students: SelfMessage on their own threads only.
// - Staff: MessagingStaffRead/Send.
function canSee(req: import('express').Request): boolean {
  const ctx = als.getStore();
  if (!ctx?.role) return false;
  if (ctx.role === 'student') return true;
  return roleHasCapability(ctx.role, Capabilities.MessagingStaffRead);
}

function canSend(req: import('express').Request): boolean {
  const ctx = als.getStore();
  if (!ctx?.role) return false;
  if (ctx.role === 'student') return true;
  return roleHasCapability(ctx.role, Capabilities.MessagingStaffSend);
}

messagingRouter.get('/threads', async (req, res) => {
  if (!canSee(req)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  // Row-level scope handles student / campus filters automatically.
  const items = await prisma.messageThread.findMany({
    orderBy: { last_message_at: 'desc' },
    take: 100,
    include: {
      student: { select: { id: true, first_name: true, last_name: true } },
      _count: { select: { messages: true } },
    },
  });
  res.json({ items });
});

const StartThreadBody = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
  student_id: z.string().uuid().optional(),
  confidential: z.boolean().optional().default(false),
});

messagingRouter.post('/threads', validate({ body: StartThreadBody }), async (req, res) => {
  if (!canSend(req)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const ctx = als.getStore();
  const body = req.body as z.infer<typeof StartThreadBody>;
  const studentId = ctx?.scope?.student_id ?? body.student_id;
  if (!studentId) {
    res.status(400).json({ error: 'student_id_required' });
    return;
  }
  // If a non-student tries to start a thread on someone else's behalf,
  // row-level scope still verifies they can see that student.
  const studentExists = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!studentExists) {
    res.status(404).json({ error: 'student_not_found' });
    return;
  }
  const confidential = body.confidential && roleHasCapability(ctx!.role!, Capabilities.CaseConfidentialAccess);
  const thread = await prisma.messageThread.create({
    data: {
      student_id: studentId,
      subject: body.subject,
      confidential: !!confidential,
    },
  });
  const message = await prisma.message.create({
    data: {
      thread_id: thread.id,
      sender_user_id: ctx!.user_id!,
      body: body.body,
    },
  });
  await prisma.messageThread.update({
    where: { id: thread.id },
    data: { last_message_at: new Date() },
  });
  await emit({
    event_type: EVENT_TYPES.MessageSent,
    student_id: studentId,
    payload: { thread_id: thread.id, message_id: message.id, sender_user_id: ctx!.user_id! },
  });
  void audit({ action: 'message.thread_started', resource_type: 'message_thread', resource_id: thread.id });
  res.status(201).json({ thread, message });
});

messagingRouter.get('/threads/:id', async (req, res) => {
  if (!canSee(req)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const thread = await prisma.messageThread.findFirst({
    where: { id: req.params.id },
    include: {
      messages: { orderBy: { created_at: 'asc' } },
      student: { select: { id: true, first_name: true, last_name: true } },
    },
  });
  if (!thread) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json(thread);
});

const ReplyBody = z.object({ body: z.string().min(1).max(10_000) });

messagingRouter.post('/threads/:id/messages', validate({ body: ReplyBody }), async (req, res) => {
  if (!canSend(req)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const ctx = als.getStore();
  const thread = await prisma.messageThread.findFirst({ where: { id: req.params.id } });
  if (!thread) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  const message = await prisma.message.create({
    data: {
      thread_id: thread.id,
      sender_user_id: ctx!.user_id!,
      body: (req.body as z.infer<typeof ReplyBody>).body,
    },
  });
  await prisma.messageThread.update({
    where: { id: thread.id },
    data: { last_message_at: new Date() },
  });
  await emit({
    event_type: EVENT_TYPES.MessageSent,
    student_id: thread.student_id,
    payload: { thread_id: thread.id, message_id: message.id, sender_user_id: ctx!.user_id! },
  });
  res.status(201).json(message);
});

messagingRouter.post('/threads/:id/read', async (req, res) => {
  if (!canSee(req)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const ctx = als.getStore();
  const thread = await prisma.messageThread.findFirst({ where: { id: req.params.id } });
  if (!thread) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  await prisma.message.updateMany({
    where: { thread_id: thread.id },
    data: {
      read_by: { set: undefined } as never,
    },
  });
  // The above set is a placeholder — Prisma JSON merging requires raw SQL or
  // application-side; we fetch + write each message's read_by array.
  const messages = await prisma.message.findMany({ where: { thread_id: thread.id } });
  for (const m of messages) {
    const readers = (m.read_by as string[] | null) ?? [];
    if (!readers.includes(ctx!.user_id!)) {
      readers.push(ctx!.user_id!);
      await prisma.message.update({ where: { id: m.id }, data: { read_by: readers as never } });
    }
  }
  await emit({
    event_type: EVENT_TYPES.MessageRead,
    student_id: thread.student_id,
    payload: { thread_id: thread.id, reader_user_id: ctx!.user_id! },
  });
  res.status(204).end();
});

messagingRouter.post('/threads/:id/resolve', async (req, res) => {
  if (!canSend(req)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const updated = await prisma.messageThread.update({
    where: { id: req.params.id },
    data: { status: 'resolved' },
  });
  res.json(updated);
});
