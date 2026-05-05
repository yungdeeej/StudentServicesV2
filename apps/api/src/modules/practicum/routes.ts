import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { emit, EVENT_TYPES } from '../../core/events/bus.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';
import { recomputePracticumFlags } from './workflows.js';

export const practicumRouter: Router = Router();
practicumRouter.use(requireAuth);

const PlacementCreateBody = z.object({
  student_id: z.string().uuid(),
  site_name: z.string(),
  supervisor_id: z.string().uuid().optional(),
  start_date: z.string(),
  end_date: z.string().optional(),
  hours_target: z.number().int().nonnegative(),
});

practicumRouter.get(
  '/placements',
  requirePermission(Capabilities.StudentRead),
  async (_req, res) => {
    const items = await prisma.practicumPlacement.findMany({
      include: { student: { select: { first_name: true, last_name: true } }, supervisor: true },
      take: 200,
    });
    res.json({ items });
  },
);

practicumRouter.post(
  '/placements',
  requirePermission(Capabilities.StudentUpdate),
  validate({ body: PlacementCreateBody }),
  async (req, res) => {
    const data = req.body as z.infer<typeof PlacementCreateBody>;
    const placement = await prisma.practicumPlacement.create({
      data: {
        ...data,
        start_date: new Date(data.start_date),
        end_date: data.end_date ? new Date(data.end_date) : undefined,
        status: 'active',
      },
    });
    await emit({
      event_type: EVENT_TYPES.PracticumStarted,
      student_id: data.student_id,
      payload: { placement_id: placement.id, started_at: placement.start_date.toISOString() },
    });
    await recomputePracticumFlags(data.student_id);
    res.status(201).json(placement);
  },
);

const HoursLogBody = z.object({
  occurred_on: z.string(),
  hours: z.number().positive(),
  notes: z.string().optional(),
  approved: z.boolean().default(false),
});

practicumRouter.post(
  '/placements/:id/hours',
  requirePermission(Capabilities.StudentUpdate),
  validate({ body: HoursLogBody }),
  async (req, res) => {
    const placementId = req.params.id;
    const body = req.body as z.infer<typeof HoursLogBody>;
    const placement = await prisma.practicumPlacement.findUnique({ where: { id: placementId } });
    if (!placement) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const log = await prisma.practicumHoursLog.create({
      data: { ...body, placement_id: placementId, occurred_on: new Date(body.occurred_on) },
    });
    await recomputePracticumFlags(placement.student_id);
    res.status(201).json(log);
  },
);

const CompleteBody = z.object({});

practicumRouter.post(
  '/placements/:id/complete',
  requirePermission(Capabilities.StudentUpdate),
  validate({ body: CompleteBody }),
  async (req, res) => {
    const id = req.params.id;
    const placement = await prisma.practicumPlacement.findUnique({
      where: { id },
      include: { hours_logs: true },
    });
    if (!placement) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const total = placement.hours_logs.filter((l) => l.approved).reduce((a, l) => a + l.hours, 0);
    const updated = await prisma.practicumPlacement.update({
      where: { id },
      data: { status: 'completed', end_date: new Date() },
    });
    await emit({
      event_type: EVENT_TYPES.PracticumCompleted,
      student_id: placement.student_id,
      payload: { placement_id: id, completed_at: new Date().toISOString(), hours_total: total },
    });
    await recomputePracticumFlags(placement.student_id);
    res.json(updated);
  },
);
