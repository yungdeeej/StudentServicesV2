import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { audit } from '../../core/audit.js';
import { emit, EVENT_TYPES } from '../../core/events/bus.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities, roleHasCapability } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';
import { als } from '../../core/async-context.js';
import { computeAvailableSlots } from './slots.js';
import { getIntegrations } from '../../integrations/factory.js';

export const appointmentsRouter: Router = Router();
appointmentsRouter.use(requireAuth);

// ----- Staff availability ---------------------------------------------------

const AvailabilityBody = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_minute: z.number().int().min(0).max(60 * 24 - 1),
  end_minute: z.number().int().min(1).max(60 * 24),
  slot_minutes: z.number().int().min(15).max(120).default(30),
  appointment_kinds: z.array(z.enum(['advising', 'counseling', 'tutoring', 'career', 'other'])).min(1),
});

appointmentsRouter.post(
  '/availability',
  requirePermission(Capabilities.AppointmentManageOwn),
  validate({ body: AvailabilityBody }),
  async (req, res) => {
    const ctx = als.getStore();
    const body = req.body as z.infer<typeof AvailabilityBody>;
    if (body.end_minute <= body.start_minute) {
      res.status(400).json({ error: 'end_before_start' });
      return;
    }
    const row = await prisma.staffAvailability.create({
      data: { ...body, user_id: ctx!.user_id! },
    });
    res.status(201).json(row);
  },
);

appointmentsRouter.get(
  '/availability/me',
  requirePermission(Capabilities.AppointmentManageOwn),
  async (_req, res) => {
    const ctx = als.getStore();
    const items = await prisma.staffAvailability.findMany({
      where: { user_id: ctx!.user_id! },
      orderBy: [{ day_of_week: 'asc' }, { start_minute: 'asc' }],
    });
    res.json({ items });
  },
);

// ----- Slot search (open to anyone authenticated) ---------------------------

const SlotsQuery = z.object({
  staff_user_id: z.string().uuid(),
  kind: z.enum(['advising', 'counseling', 'tutoring', 'career', 'other']),
  from: z.string(),
  to: z.string(),
});

appointmentsRouter.get('/slots', validate({ query: SlotsQuery }), async (req, res) => {
  const q = req.query as unknown as z.infer<typeof SlotsQuery>;
  const slots = await computeAvailableSlots({
    staff_user_id: q.staff_user_id,
    kind: q.kind,
    from: new Date(q.from),
    to: new Date(q.to),
  });
  res.json({ slots });
});

// ----- Booking --------------------------------------------------------------

const BookBody = z.object({
  staff_user_id: z.string().uuid(),
  kind: z.enum(['advising', 'counseling', 'tutoring', 'career', 'other']),
  scheduled_at: z.string(),
  duration_minutes: z.number().int().min(15).max(120).default(30),
  location: z.enum(['in_person', 'video', 'phone']).default('video'),
  notes_student: z.string().max(1000).optional(),
});

appointmentsRouter.post('/', validate({ body: BookBody }), async (req, res) => {
  const ctx = als.getStore();
  const body = req.body as z.infer<typeof BookBody>;
  const role = ctx!.role!;
  // Either student booking for themselves, or staff booking for a student
  let studentId: string | undefined;
  if (role === 'student') {
    if (!ctx!.scope?.student_id) {
      res.status(403).json({ error: 'no_student_link' });
      return;
    }
    studentId = ctx!.scope.student_id;
    if (
      body.kind === 'counseling' &&
      !roleHasCapability(role, Capabilities.SelfBookCounseling)
    ) {
      res.status(403).json({ error: 'counseling_not_allowed' });
      return;
    }
  } else {
    res.status(400).json({ error: 'staff_must_specify_student_via_thread' });
    return;
  }
  const scheduled = new Date(body.scheduled_at);
  // Collision check
  const conflict = await prisma.appointment.findFirst({
    where: {
      staff_user_id: body.staff_user_id,
      scheduled_at: scheduled,
      status: { notIn: ['cancelled', 'no_show'] },
    },
  });
  if (conflict) {
    res.status(409).json({ error: 'slot_taken' });
    return;
  }
  const appt = await prisma.appointment.create({
    data: {
      student_id: studentId,
      staff_user_id: body.staff_user_id,
      kind: body.kind,
      scheduled_at: scheduled,
      duration_minutes: body.duration_minutes,
      location: body.location,
      notes_student: body.notes_student,
    },
  });
  // Optional Google Calendar push
  try {
    const integrations = getIntegrations();
    const staff = await prisma.user.findUnique({ where: { id: body.staff_user_id } });
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (staff && student) {
      const evt = await integrations.google.createCalendarEvent({
        summary: `${body.kind} — ${student.first_name} ${student.last_name}`,
        start: scheduled.toISOString(),
        end: new Date(scheduled.getTime() + body.duration_minutes * 60_000).toISOString(),
        attendees: [staff.email, student.email],
      });
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { google_event_id: evt.event_id },
      });
    }
  } catch {
    // Non-fatal — calendar is a nice-to-have.
  }
  await emit({
    event_type: EVENT_TYPES.AppointmentRequested,
    student_id: studentId,
    payload: { appointment_id: appt.id, kind: appt.kind, scheduled_at: appt.scheduled_at.toISOString() },
  });
  await emit({
    event_type: EVENT_TYPES.TaskCreated,
    student_id: studentId,
    payload: {
      title: `Confirm ${body.kind} appointment`,
      owner_user_id: body.staff_user_id,
      priority: 'normal',
      due_at: scheduled.toISOString(),
    },
  });
  void audit({ action: 'appointment.requested', resource_type: 'appointment', resource_id: appt.id });
  res.status(201).json(appt);
});

appointmentsRouter.get('/me', async (_req, res) => {
  const ctx = als.getStore();
  if (ctx!.role === 'student') {
    const items = await prisma.appointment.findMany({
      where: { student_id: ctx!.scope!.student_id ?? undefined },
      orderBy: { scheduled_at: 'asc' },
    });
    res.json({ items });
    return;
  }
  // Staff: their own calendar
  const items = await prisma.appointment.findMany({
    where: { staff_user_id: ctx!.user_id! },
    orderBy: { scheduled_at: 'asc' },
    include: { student: { select: { first_name: true, last_name: true } } },
  });
  res.json({ items });
});

const StatusBody = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed', 'no_show']),
  reason: z.string().optional(),
});

appointmentsRouter.post(
  '/:id/status',
  validate({ body: StatusBody }),
  async (req, res) => {
    const ctx = als.getStore();
    const id = req.params.id;
    const body = req.body as z.infer<typeof StatusBody>;
    const before = await prisma.appointment.findUnique({ where: { id } });
    if (!before) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    // Students may only cancel their own.
    if (ctx!.role === 'student') {
      if (before.student_id !== ctx!.scope?.student_id || body.status !== 'cancelled') {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
    } else if (!roleHasCapability(ctx!.role!, Capabilities.AppointmentManageOwn)) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: body.status,
        cancelled_at: body.status === 'cancelled' ? new Date() : undefined,
        cancelled_reason: body.status === 'cancelled' ? body.reason : undefined,
      },
    });
    const evt =
      body.status === 'confirmed'
        ? EVENT_TYPES.AppointmentConfirmed
        : body.status === 'cancelled'
          ? EVENT_TYPES.AppointmentCancelled
          : body.status === 'completed'
            ? EVENT_TYPES.AppointmentCompleted
            : null;
    if (evt) {
      await emit({
        event_type: evt,
        student_id: before.student_id,
        payload: { appointment_id: id, kind: before.kind, status: body.status },
      });
    }
    void audit({ action: `appointment.${body.status}`, resource_type: 'appointment', resource_id: id, before, after: updated });
    res.json(updated);
  },
);
