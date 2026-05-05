import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { audit } from '../../core/audit.js';
import { emit, EVENT_TYPES } from '../../core/events/bus.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';

export const riskRouter: Router = Router();
riskRouter.use(requireAuth);

riskRouter.get(
  '/at-risk',
  requirePermission(Capabilities.StudentRead),
  async (_req, res) => {
    const items = await prisma.student.findMany({
      where: { flags: { at_risk_flag: true }, deleted_at: null },
      take: 200,
      include: { flags: true, program: { select: { name: true } }, campus: { select: { name: true } } },
    });
    res.json({ items });
  },
);

riskRouter.get(
  '/heatmap',
  requirePermission(Capabilities.DashboardKpiView),
  async (_req, res) => {
    const buckets = await prisma.studentFlags.groupBy({
      by: ['risk_score'],
      where: { at_risk_flag: true },
      _count: { _all: true },
    });
    res.json({ buckets });
  },
);

riskRouter.get(
  '/students/:id/trend',
  requirePermission(Capabilities.StudentRead),
  async (req, res) => {
    const items = await prisma.riskAssessment.findMany({
      where: { student_id: req.params.id },
      orderBy: { computed_at: 'asc' },
      take: 200,
    });
    res.json({ items });
  },
);

const CaseListQuery = z.object({ status: z.string().optional() });

riskRouter.get(
  '/cases',
  requirePermission(Capabilities.CaseRead),
  validate({ query: CaseListQuery }),
  async (req, res) => {
    const q = req.query as unknown as z.infer<typeof CaseListQuery>;
    const items = await prisma.case.findMany({
      where: q.status ? { status: q.status as never } : {},
      orderBy: { opened_at: 'desc' },
      take: 200,
      include: { student: { select: { first_name: true, last_name: true, campus_id: true } } },
    });
    res.json({ items });
  },
);

const CaseActionBody = z.object({
  notes: z.string().min(1),
});

riskRouter.post(
  '/cases/:id/actions',
  requirePermission(Capabilities.CaseAssign),
  validate({ body: CaseActionBody }),
  async (req, res) => {
    const id = req.params.id;
    const c = await prisma.case.findUnique({ where: { id } });
    if (!c) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    await prisma.case.update({ where: { id }, data: { last_action_at: new Date() } });
    await emit({
      event_type: EVENT_TYPES.CaseActionLogged,
      student_id: c.student_id,
      payload: { case_id: id, notes: (req.body as { notes: string }).notes },
    });
    void audit({ action: 'case.action_logged', resource_type: 'case', resource_id: id });
    res.status(204).end();
  },
);

const CaseCloseBody = z.object({ resolution: z.string().min(1) });

riskRouter.post(
  '/cases/:id/close',
  requirePermission(Capabilities.CaseClose),
  validate({ body: CaseCloseBody }),
  async (req, res) => {
    const id = req.params.id;
    const c = await prisma.case.findUnique({ where: { id } });
    if (!c) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const updated = await prisma.case.update({
      where: { id },
      data: {
        status: 'closed',
        closed_at: new Date(),
        resolution: (req.body as { resolution: string }).resolution,
      },
    });
    await emit({
      event_type: EVENT_TYPES.CaseClosed,
      student_id: c.student_id,
      payload: { case_id: id, resolution: updated.resolution },
    });
    void audit({ action: 'case.closed', resource_type: 'case', resource_id: id, before: c, after: updated });
    res.json(updated);
  },
);

const RiskRulesBody = z.object({
  weight_grade_below_threshold: z.number().int().optional(),
  weight_missing_grades_overdue: z.number().int().optional(),
  weight_attendance_below_threshold: z.number().int().optional(),
  weight_no_attendance_recorded: z.number().int().optional(),
  weight_esl_below_threshold: z.number().int().optional(),
  weight_age_gte_65: z.number().int().optional(),
  weight_withdrawal_initiated: z.number().int().optional(),
  flag_threshold: z.number().int().optional(),
});

riskRouter.get(
  '/rules',
  requirePermission(Capabilities.RiskRulesRead),
  async (_req, res) => {
    const cfg = await prisma.riskRuleConfig.findFirst({
      where: { active: true },
      orderBy: { effective_at: 'desc' },
    });
    res.json(cfg);
  },
);

riskRouter.put(
  '/rules',
  requirePermission(Capabilities.RiskRulesEdit),
  validate({ body: RiskRulesBody }),
  async (req, res) => {
    const data = req.body as z.infer<typeof RiskRulesBody>;
    const created = await prisma.riskRuleConfig.create({ data });
    void audit({ action: 'risk_rules.updated', resource_type: 'risk_rules', resource_id: created.id, after: created });
    res.json(created);
  },
);
