import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { audit } from '../../core/audit.js';
import { emit, EVENT_TYPES } from '../../core/events/bus.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';

export const supportRouter: Router = Router();
supportRouter.use(requireAuth);

// Interventions ---------------------------------------------------------------
supportRouter.get(
  '/interventions',
  requirePermission(Capabilities.CaseRead),
  async (_req, res) => {
    const items = await prisma.intervention.findMany({
      take: 200,
      orderBy: { assigned_at: 'desc' },
      include: { student: { select: { first_name: true, last_name: true } } },
    });
    res.json({ items });
  },
);

const InterventionCompleteBody = z.object({ outcome: z.string().min(1) });

supportRouter.post(
  '/interventions/:id/complete',
  requirePermission(Capabilities.InterventionComplete),
  validate({ body: InterventionCompleteBody }),
  async (req, res) => {
    const id = req.params.id;
    const before = await prisma.intervention.findUnique({ where: { id } });
    if (!before) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const updated = await prisma.intervention.update({
      where: { id },
      data: {
        status: 'completed',
        outcome: (req.body as { outcome: string }).outcome,
        completed_at: new Date(),
      },
    });
    await emit({
      event_type: EVENT_TYPES.InterventionCompleted,
      student_id: before.student_id,
      payload: { intervention_id: id, outcome: updated.outcome },
    });
    void audit({ action: 'intervention.completed', resource_type: 'intervention', resource_id: id, after: updated });
    res.json(updated);
  },
);

// Class audits ----------------------------------------------------------------
const ClassAuditBody = z.object({
  student_id: z.string().uuid().optional(),
  class_ref: z.string().min(1),
  issues: z.array(z.string()).default([]),
});

supportRouter.post(
  '/class-audits',
  requirePermission(Capabilities.CaseOpen),
  validate({ body: ClassAuditBody }),
  async (req, res) => {
    const data = req.body as z.infer<typeof ClassAuditBody>;
    const due = new Date();
    due.setDate(due.getDate() + 5);
    const row = await prisma.classAudit.create({
      data: { ...data, due_at: due },
    });
    await emit({
      event_type: EVENT_TYPES.ClassAuditLogged,
      student_id: row.student_id,
      payload: { audit_id: row.id, class_id: row.class_ref, issues: row.issues },
    });
    res.status(201).json(row);
  },
);

const ClassAuditResolveBody = z.object({ resolution: z.string().min(1) });

supportRouter.post(
  '/class-audits/:id/resolve',
  requirePermission(Capabilities.CaseClose),
  validate({ body: ClassAuditResolveBody }),
  async (req, res) => {
    const id = req.params.id;
    const updated = await prisma.classAudit.update({
      where: { id },
      data: {
        resolution: (req.body as { resolution: string }).resolution,
        resolved_at: new Date(),
      },
    });
    await emit({
      event_type: EVENT_TYPES.ClassAuditResolved,
      student_id: updated.student_id,
      payload: { audit_id: id, resolution: updated.resolution },
    });
    res.json(updated);
  },
);

// Accommodations --------------------------------------------------------------
const AccommodationBody = z.object({
  student_id: z.string().uuid(),
  type: z.string(),
  description: z.string(),
});

supportRouter.post(
  '/accommodations',
  requirePermission(Capabilities.StudentUpdate),
  validate({ body: AccommodationBody }),
  async (req, res) => {
    const data = req.body as z.infer<typeof AccommodationBody>;
    const row = await prisma.accommodationRequest.create({ data });
    await emit({
      event_type: EVENT_TYPES.AccommodationRequested,
      student_id: data.student_id,
      payload: { accommodation_id: row.id, type: row.type },
    });
    res.status(201).json(row);
  },
);

supportRouter.post(
  '/accommodations/:id/approve',
  requirePermission(Capabilities.InterventionRun),
  async (req, res) => {
    const id = req.params.id;
    const updated = await prisma.accommodationRequest.update({
      where: { id },
      data: { status: 'approved', approved_at: new Date() },
    });
    await emit({
      event_type: EVENT_TYPES.AccommodationApproved,
      student_id: updated.student_id,
      payload: { accommodation_id: id },
    });
    res.json(updated);
  },
);

// Re-entry --------------------------------------------------------------------
supportRouter.get(
  '/reentry-plans',
  requirePermission(Capabilities.StudentRead),
  async (_req, res) => {
    const items = await prisma.reentryPlan.findMany({
      include: { checks: true, student: { select: { first_name: true, last_name: true } } },
      orderBy: { initiated_at: 'desc' },
      take: 100,
    });
    res.json({ items });
  },
);

// Withdrawals -----------------------------------------------------------------
const WithdrawalBody = z.object({
  student_id: z.string().uuid(),
  reason: z.string().min(1),
});

supportRouter.post(
  '/withdrawals',
  requirePermission(Capabilities.StudentUpdate),
  validate({ body: WithdrawalBody }),
  async (req, res) => {
    const body = req.body as z.infer<typeof WithdrawalBody>;
    const wd = await prisma.withdrawalRecord.create({ data: body });
    await emit({
      event_type: EVENT_TYPES.WithdrawalInitiated,
      student_id: body.student_id,
      payload: { reason: body.reason },
    });
    res.status(201).json(wd);
  },
);

supportRouter.post(
  '/withdrawals/:id/confirm',
  requirePermission(Capabilities.StudentUpdate),
  async (req, res) => {
    const id = req.params.id;
    const wd = await prisma.withdrawalRecord.update({
      where: { id },
      data: { confirmed_at: new Date(), effective_date: new Date() },
    });
    await prisma.student.update({ where: { id: wd.student_id }, data: { status: 'withdrawn' } });
    await emit({
      event_type: EVENT_TYPES.WithdrawalConfirmed,
      student_id: wd.student_id,
      payload: { effective_date: wd.effective_date?.toISOString() },
    });
    await emit({
      event_type: EVENT_TYPES.StudentStatusChanged,
      student_id: wd.student_id,
      payload: { from: 'stay', to: 'withdrawn' },
    });
    res.json(wd);
  },
);
