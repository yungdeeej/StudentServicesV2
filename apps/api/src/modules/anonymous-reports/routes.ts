import { Router } from 'express';
import { z } from 'zod';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../../core/db/prisma.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';
import { emit, EVENT_TYPES } from '../../core/events/bus.js';
import { logger } from '../../core/logger.js';

// Public submission endpoint (no auth) — students or anyone can submit.
// We hand back a token the submitter can use to check status without
// revealing identity.
export const anonymousReportsPublicRouter: Router = Router();

const SubmitBody = z.object({
  category: z.enum(['harassment', 'discrimination', 'mental_health', 'safety', 'academic_integrity', 'other']),
  campus_id: z.string().uuid().optional(),
  body: z.string().min(20).max(5000),
  contact_optional: z.string().max(200).optional(),
});

anonymousReportsPublicRouter.post(
  '/anon/report',
  validate({ body: SubmitBody }),
  async (req, res) => {
    const body = req.body as z.infer<typeof SubmitBody>;
    const claimToken = randomBytes(16).toString('hex');
    const hash_token = createHash('sha256').update(claimToken).digest('hex');
    const report = await prisma.anonymousReport.create({
      data: { hash_token, ...body },
    });
    await emit({
      event_type: EVENT_TYPES.AnonymousReportSubmitted,
      student_id: null,
      payload: { report_id: report.id, category: report.category, campus_id: report.campus_id },
    });
    logger.info({ report_id: report.id, category: report.category }, 'anon_report.submitted');
    // Return the unhashed token ONCE so the submitter can later check status.
    res.status(201).json({
      ok: true,
      claim_token: claimToken,
      message:
        'Thanks for trusting us with this. Your report has been received and will be reviewed within 1 business day. Save the claim token below — it is the only way to check status without giving your identity.',
    });
  },
);

const StatusBody = z.object({ claim_token: z.string().min(8).max(128) });

anonymousReportsPublicRouter.post(
  '/anon/report/status',
  validate({ body: StatusBody }),
  async (req, res) => {
    const { claim_token } = req.body as z.infer<typeof StatusBody>;
    const hash = createHash('sha256').update(claim_token).digest('hex');
    const report = await prisma.anonymousReport.findUnique({ where: { hash_token: hash } });
    if (!report) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({
      status: report.status,
      created_at: report.created_at,
      resolved_at: report.resolved_at,
      notes_visible_to_reporter: report.status === 'resolved' ? report.notes : null,
    });
  },
);

// Staff-side triage queue
export const anonymousReportsStaffRouter: Router = Router();
anonymousReportsStaffRouter.use(requireAuth);

anonymousReportsStaffRouter.get(
  '/',
  requirePermission(Capabilities.AnonymousReportTriage),
  async (req, res) => {
    const items = await prisma.anonymousReport.findMany({
      where: req.query.status ? { status: req.query.status as never } : {},
      orderBy: { created_at: 'desc' },
      take: 200,
    });
    res.json({ items });
  },
);

const UpdateBody = z.object({
  status: z.enum(['triaged', 'in_progress', 'resolved', 'closed_no_action']),
  notes: z.string().max(5000).optional(),
});

anonymousReportsStaffRouter.post(
  '/:id',
  requirePermission(Capabilities.AnonymousReportTriage),
  validate({ body: UpdateBody }),
  async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof UpdateBody>;
    const updated = await prisma.anonymousReport.update({
      where: { id },
      data: {
        status: body.status,
        notes: body.notes,
        resolved_at: body.status === 'resolved' || body.status === 'closed_no_action' ? new Date() : undefined,
      },
    });
    res.json(updated);
  },
);
