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
import { assessWellness } from './scoring.js';
import { logger } from '../../core/logger.js';

export const wellnessRouter: Router = Router();
wellnessRouter.use(requireAuth);

// ----- Crisis resources (always public-ish; any authed user can read) ------

wellnessRouter.get('/crisis-resources', async (_req, res) => {
  const items = await prisma.resource.findMany({
    where: { is_crisis: true },
    orderBy: { published_at: 'desc' },
  });
  res.json({ items });
});

// ----- Student-side: submit a checkin --------------------------------------

const CheckinBody = z.object({
  phq2_q1: z.number().int().min(0).max(3),
  phq2_q2: z.number().int().min(0).max(3),
  stress_score: z.number().int().min(0).max(10),
  energy_score: z.number().int().min(0).max(10).optional(),
  sleep_hours: z.number().min(0).max(24).optional(),
  free_text: z.string().max(2000).optional(),
});

wellnessRouter.post(
  '/checkins',
  requirePermission(Capabilities.SelfWellnessCheckin),
  validate({ body: CheckinBody }),
  async (req, res) => {
    const ctx = als.getStore();
    const studentId = ctx!.scope?.student_id;
    if (!studentId) {
      res.status(403).json({ error: 'no_student_link' });
      return;
    }
    const body = req.body as z.infer<typeof CheckinBody>;
    const assessment = assessWellness(body);

    const checkin = await prisma.wellnessCheckin.create({
      data: {
        student_id: studentId,
        phq2_q1: body.phq2_q1,
        phq2_q2: body.phq2_q2,
        phq2_total: assessment.phq2_total,
        stress_score: body.stress_score,
        energy_score: body.energy_score,
        sleep_hours: body.sleep_hours,
        free_text: body.free_text,
        risk_tier: assessment.risk_tier,
        ai_flagged: assessment.crisis_phrase_hit,
      },
    });

    await emit({
      event_type: EVENT_TYPES.WellnessCheckinSubmitted,
      student_id: studentId,
      payload: { checkin_id: checkin.id, risk_tier: checkin.risk_tier, phq2_total: checkin.phq2_total },
    });

    if (assessment.risk_tier === 'crisis' || assessment.risk_tier === 'high') {
      await emit({
        event_type: EVENT_TYPES.WellnessCrisisDetected,
        student_id: studentId,
        payload: {
          checkin_id: checkin.id,
          risk_tier: checkin.risk_tier,
          crisis_phrase_hit: assessment.crisis_phrase_hit,
        },
      });
      logger.warn(
        { student_id: studentId, risk_tier: assessment.risk_tier },
        'wellness.crisis_detected',
      );
    }

    void audit({
      action: 'wellness.checkin_submitted',
      resource_type: 'wellness_checkin',
      resource_id: checkin.id,
    });

    // Always return crisis hotline info on tier=crisis|high.
    const crisisResources =
      assessment.risk_tier === 'crisis' || assessment.risk_tier === 'high'
        ? await prisma.resource.findMany({
            where: { is_crisis: true },
            orderBy: { published_at: 'desc' },
            take: 5,
          })
        : [];
    res.status(201).json({
      checkin,
      crisis_resources: crisisResources,
      message:
        assessment.risk_tier === 'crisis'
          ? "We're glad you reached out. A counselor will contact you shortly. If you need to speak to someone now, the resources below are available 24/7."
          : assessment.risk_tier === 'high'
            ? "Thanks for sharing. We've notified our counseling team to follow up within 24 hours. Resources below are available any time."
            : "Thanks for checking in. We're here whenever you need us.",
    });
  },
);

wellnessRouter.get(
  '/checkins/me',
  requirePermission(Capabilities.SelfWellnessCheckin),
  async (_req, res) => {
    const ctx = als.getStore();
    const id = ctx!.scope?.student_id;
    if (!id) {
      res.status(403).json({ error: 'no_student_link' });
      return;
    }
    const items = await prisma.wellnessCheckin.findMany({
      where: { student_id: id },
      orderBy: { occurred_at: 'desc' },
      take: 60,
    });
    res.json({ items });
  },
);

// ----- Counselor-side: triage queue ----------------------------------------

wellnessRouter.get(
  '/queue',
  requirePermission(Capabilities.WellnessTriage),
  async (_req, res) => {
    const items = await prisma.wellnessCheckin.findMany({
      where: { risk_tier: { in: ['high', 'crisis'] } },
      orderBy: { occurred_at: 'desc' },
      take: 200,
      include: { student: { select: { id: true, first_name: true, last_name: true, campus_id: true } } },
    });
    res.json({ items });
  },
);

const TriageBody = z.object({
  outcome: z.enum(['contacted', 'no_response', 'escalated', 'resolved']),
  notes: z.string().optional(),
});

wellnessRouter.post(
  '/checkins/:id/triage',
  requirePermission(Capabilities.WellnessTriage),
  validate({ body: TriageBody }),
  async (req, res) => {
    const id = req.params.id;
    const ctx = als.getStore();
    const checkin = await prisma.wellnessCheckin.findUnique({ where: { id } });
    if (!checkin) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    void audit({
      action: `wellness.triage.${(req.body as z.infer<typeof TriageBody>).outcome}`,
      resource_type: 'wellness_checkin',
      resource_id: id,
    });
    if ((req.body as z.infer<typeof TriageBody>).outcome === 'escalated') {
      // Open a confidential case
      await prisma.case.create({
        data: {
          student_id: checkin.student_id,
          reason: 'wellness_escalation',
          kind: 'wellness',
          confidential: true,
          assignee_id: ctx!.user_id!,
        },
      });
    }
    res.status(204).end();
  },
);
