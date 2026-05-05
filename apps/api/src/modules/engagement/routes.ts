import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { audit } from '../../core/audit.js';
import { emit, EVENT_TYPES } from '../../core/events/bus.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';

export const engagementRouter: Router = Router();
engagementRouter.use(requireAuth);

engagementRouter.get(
  '/distribution',
  requirePermission(Capabilities.DashboardKpiView),
  async (_req, res) => {
    const tiers = await prisma.studentFlags.groupBy({
      by: ['engagement_tier'],
      _count: { _all: true },
    });
    res.json({ tiers });
  },
);

engagementRouter.get('/connect-rooms', requirePermission(Capabilities.StudentRead), async (_req, res) => {
  const rooms = await prisma.connectRoom.findMany({
    include: { _count: { select: { assignments: true } } },
  });
  res.json({ rooms });
});

const NewsletterSendBody = z.object({
  newsletter_id: z.string(),
  subject: z.string(),
  recipient_student_ids: z.array(z.string().uuid()),
});

engagementRouter.post(
  '/newsletters/send',
  requirePermission(Capabilities.StudentUpdate),
  validate({ body: NewsletterSendBody }),
  async (req, res) => {
    const body = req.body as z.infer<typeof NewsletterSendBody>;
    const created = await Promise.all(
      body.recipient_student_ids.map((sid) =>
        prisma.newsletterDelivery.create({
          data: {
            student_id: sid,
            newsletter_id: body.newsletter_id,
            subject: body.subject,
            status: 'sent',
            sent_at: new Date(),
          },
        }),
      ),
    );
    for (const d of created) {
      await emit({
        event_type: EVENT_TYPES.NewsletterSent,
        student_id: d.student_id,
        payload: { delivery_id: d.id, newsletter_id: d.newsletter_id, sent_at: d.sent_at?.toISOString() },
      });
    }
    void audit({ action: 'newsletter.sent', resource_type: 'newsletter', resource_id: body.newsletter_id });
    res.json({ sent: created.length });
  },
);

// Open-tracking pixel — public endpoint; updates open_count and emits event.
engagementRouter.get('/newsletters/pixel/:delivery_id.gif', async (req, res) => {
  const id = req.params.delivery_id;
  const before = await prisma.newsletterDelivery.findUnique({ where: { id } });
  if (before) {
    await prisma.newsletterDelivery.update({
      where: { id },
      data: { opened_at: before.opened_at ?? new Date(), open_count: { increment: 1 } },
    });
    await emit({
      event_type: EVENT_TYPES.NewsletterOpened,
      student_id: before.student_id,
      payload: { delivery_id: id },
    });
  }
  // 1x1 transparent gif
  const gif = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64',
  );
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store');
  res.send(gif);
});

const EventAttendedBody = z.object({
  student_id: z.string().uuid(),
  event_kind: z.string(),
  event_ref: z.string().optional(),
});

engagementRouter.post(
  '/events/attended',
  requirePermission(Capabilities.StudentUpdate),
  validate({ body: EventAttendedBody }),
  async (req, res) => {
    const body = req.body as z.infer<typeof EventAttendedBody>;
    const row = await prisma.eventParticipation.create({ data: body });
    await emit({
      event_type: EVENT_TYPES.EngagementEventAttended,
      student_id: body.student_id,
      payload: { event_id: row.id, event_type: body.event_kind, attended_at: row.attended_at.toISOString() },
    });
    res.json(row);
  },
);
