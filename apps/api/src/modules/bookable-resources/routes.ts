import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';
import { emit, EVENT_TYPES } from '../../core/events/bus.js';
import { als } from '../../core/async-context.js';

export const bookableResourcesRouter: Router = Router();
bookableResourcesRouter.use(requireAuth);

const ListQuery = z.object({
  campus_id: z.string().uuid().optional(),
  kind: z.enum(['study_room', 'equipment', 'library', 'lab']).optional(),
});

bookableResourcesRouter.get('/', validate({ query: ListQuery }), async (req, res) => {
  const q = req.query as unknown as z.infer<typeof ListQuery>;
  const items = await prisma.bookableResource.findMany({
    where: { active: true, ...(q.campus_id ? { campus_id: q.campus_id } : {}), ...(q.kind ? { kind: q.kind } : {}) },
    orderBy: [{ kind: 'asc' }, { name: 'asc' }],
  });
  res.json({ items });
});

const BookBody = z.object({
  resource_id: z.string().uuid(),
  starts_at: z.string(),
  ends_at: z.string(),
});

bookableResourcesRouter.post(
  '/bookings',
  requirePermission(Capabilities.SelfBookResource),
  validate({ body: BookBody }),
  async (req, res) => {
    const ctx = als.getStore();
    const studentId = ctx!.scope?.student_id;
    if (!studentId) {
      res.status(403).json({ error: 'no_student_link' });
      return;
    }
    const body = req.body as z.infer<typeof BookBody>;
    const starts = new Date(body.starts_at);
    const ends = new Date(body.ends_at);
    if (ends <= starts) {
      res.status(400).json({ error: 'end_before_start' });
      return;
    }
    if (starts < new Date()) {
      res.status(400).json({ error: 'cannot_book_in_past' });
      return;
    }
    // Collision check
    const conflict = await prisma.resourceBooking.findFirst({
      where: {
        resource_id: body.resource_id,
        status: { in: ['reserved', 'confirmed'] },
        OR: [
          { starts_at: { lt: ends }, ends_at: { gt: starts } },
        ],
      },
    });
    if (conflict) {
      res.status(409).json({ error: 'slot_taken' });
      return;
    }
    const booking = await prisma.resourceBooking.create({
      data: { resource_id: body.resource_id, student_id: studentId, starts_at: starts, ends_at: ends },
    });
    await emit({
      event_type: EVENT_TYPES.ResourceBooked,
      student_id: studentId,
      payload: { booking_id: booking.id, resource_id: booking.resource_id },
    });
    res.status(201).json(booking);
  },
);

bookableResourcesRouter.get('/bookings/me', async (_req, res) => {
  const ctx = als.getStore();
  const studentId = ctx!.scope?.student_id;
  if (!studentId) {
    res.status(403).json({ error: 'no_student_link' });
    return;
  }
  const items = await prisma.resourceBooking.findMany({
    where: { student_id: studentId },
    orderBy: { starts_at: 'desc' },
    include: { resource: true },
    take: 100,
  });
  res.json({ items });
});

bookableResourcesRouter.post(
  '/bookings/:id/cancel',
  requirePermission(Capabilities.SelfBookResource),
  async (req, res) => {
    const ctx = als.getStore();
    const id = req.params.id;
    const booking = await prisma.resourceBooking.findUnique({ where: { id } });
    if (!booking || booking.student_id !== ctx!.scope?.student_id) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const updated = await prisma.resourceBooking.update({
      where: { id },
      data: { status: 'cancelled', cancelled_at: new Date() },
    });
    await emit({
      event_type: EVENT_TYPES.ResourceBookingCancelled,
      student_id: booking.student_id,
      payload: { booking_id: id },
    });
    res.json(updated);
  },
);
