import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';
import { emit, EVENT_TYPES } from '../../core/events/bus.js';
import { audit } from '../../core/audit.js';
import { als } from '../../core/async-context.js';

export const tutoringRouter: Router = Router();
tutoringRouter.use(requireAuth);

// Student creates a request
const RequestBody = z.object({
  subject: z.string().min(1).max(80),
  topic: z.string().max(200).optional(),
  urgency: z.enum(['low', 'normal', 'high']).default('normal'),
  preferred_format: z.enum(['in_person', 'video', 'any']).default('any'),
  notes: z.string().max(2000).optional(),
});

tutoringRouter.post(
  '/requests',
  requirePermission(Capabilities.SelfRequestTutoring),
  validate({ body: RequestBody }),
  async (req, res) => {
    const ctx = als.getStore();
    const studentId = ctx!.scope?.student_id;
    if (!studentId) {
      res.status(403).json({ error: 'no_student_link' });
      return;
    }
    const body = req.body as z.infer<typeof RequestBody>;
    const reqRow = await prisma.tutoringRequest.create({
      data: { ...body, student_id: studentId },
    });
    await emit({
      event_type: EVENT_TYPES.TutoringRequested,
      student_id: studentId,
      payload: { request_id: reqRow.id, subject: reqRow.subject, urgency: reqRow.urgency },
    });
    void audit({ action: 'tutoring.requested', resource_type: 'tutoring_request', resource_id: reqRow.id });
    res.status(201).json(reqRow);
  },
);

// Student's own requests
tutoringRouter.get('/requests/me', requirePermission(Capabilities.SelfRequestTutoring), async (_req, res) => {
  const ctx = als.getStore();
  const studentId = ctx!.scope?.student_id;
  if (!studentId) {
    res.status(403).json({ error: 'no_student_link' });
    return;
  }
  const items = await prisma.tutoringRequest.findMany({
    where: { student_id: studentId },
    orderBy: { created_at: 'desc' },
    include: { sessions: true },
  });
  res.json({ items });
});

// Staff: tutoring queue (unmatched first)
tutoringRouter.get(
  '/queue',
  requirePermission(Capabilities.TutoringMatch),
  async (_req, res) => {
    const items = await prisma.tutoringRequest.findMany({
      where: { status: { in: ['requested', 'matched', 'in_progress'] } },
      orderBy: [{ urgency: 'desc' }, { created_at: 'asc' }],
      include: { student: { select: { first_name: true, last_name: true, campus_id: true } } },
    });
    res.json({ items });
  },
);

const MatchBody = z.object({ tutor_user_id: z.string().uuid() });

tutoringRouter.post(
  '/requests/:id/match',
  requirePermission(Capabilities.TutoringMatch),
  validate({ body: MatchBody }),
  async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof MatchBody>;
    const reqRow = await prisma.tutoringRequest.findUnique({ where: { id } });
    if (!reqRow) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const tutor = await prisma.user.findUnique({ where: { id: body.tutor_user_id } });
    if (!tutor || (!tutor.is_peer_tutor && tutor.role !== 'tutor' && tutor.role !== 'coordinator')) {
      res.status(400).json({ error: 'invalid_tutor' });
      return;
    }
    const updated = await prisma.tutoringRequest.update({
      where: { id },
      data: { status: 'matched', matched_user_id: tutor.id, matched_at: new Date() },
    });
    await emit({
      event_type: EVENT_TYPES.TutoringMatched,
      student_id: reqRow.student_id,
      payload: { request_id: id, tutor_user_id: tutor.id },
    });
    await emit({
      event_type: EVENT_TYPES.TaskCreated,
      student_id: reqRow.student_id,
      payload: {
        title: `Tutoring matched — schedule a session`,
        owner_user_id: tutor.id,
        priority: 'normal',
      },
    });
    res.json(updated);
  },
);

const SessionBody = z.object({
  request_id: z.string().uuid(),
  scheduled_at: z.string(),
  duration_minutes: z.number().int().min(15).max(240).default(45),
});

tutoringRouter.post(
  '/sessions',
  requirePermission(Capabilities.TutoringDeliver),
  validate({ body: SessionBody }),
  async (req, res) => {
    const ctx = als.getStore();
    const body = req.body as z.infer<typeof SessionBody>;
    const session = await prisma.tutoringSession.create({
      data: {
        request_id: body.request_id,
        tutor_user_id: ctx!.user_id!,
        scheduled_at: new Date(body.scheduled_at),
        duration_minutes: body.duration_minutes,
      },
    });
    await prisma.tutoringRequest.update({
      where: { id: body.request_id },
      data: { status: 'in_progress' },
    });
    res.status(201).json(session);
  },
);

const SessionStatusBody = z.object({
  status: z.enum(['completed', 'no_show', 'cancelled']),
  notes: z.string().max(2000).optional(),
  hours_credited: z.number().min(0).max(8).optional(),
});

tutoringRouter.post(
  '/sessions/:id/status',
  requirePermission(Capabilities.TutoringDeliver),
  validate({ body: SessionStatusBody }),
  async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof SessionStatusBody>;
    const updated = await prisma.tutoringSession.update({ where: { id }, data: body });
    if (body.status === 'completed') {
      await emit({
        event_type: EVENT_TYPES.TutoringSessionCompleted,
        student_id: null,
        payload: { session_id: id, hours_credited: body.hours_credited ?? 0 },
      });
    }
    res.json(updated);
  },
);
