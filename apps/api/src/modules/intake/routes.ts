import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { audit } from '../../core/audit.js';
import { emit, EVENT_TYPES } from '../../core/events/bus.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';

export const intakeRouter: Router = Router();
intakeRouter.use(requireAuth);

intakeRouter.get('/orientation', requirePermission(Capabilities.StudentRead), async (req, res) => {
  const items = await prisma.orientationRecord.findMany({
    take: 100,
    orderBy: { scheduled_at: 'desc' },
    include: { student: { select: { id: true, first_name: true, last_name: true, email: true, campus_id: true } } },
  });
  res.json({ items });
  void req;
});

const AttendBody = z.object({ attended: z.boolean() });

intakeRouter.post(
  '/orientation/:id',
  requirePermission(Capabilities.StudentUpdate),
  validate({ body: AttendBody }),
  async (req, res) => {
    const id = req.params.id;
    const { attended } = req.body as z.infer<typeof AttendBody>;
    const before = await prisma.orientationRecord.findUnique({ where: { id } });
    if (!before) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const updated = await prisma.orientationRecord.update({
      where: { id },
      data: { attended_at: attended ? new Date() : null, missed: !attended },
    });
    void audit({
      action: attended ? 'orientation.attended' : 'orientation.missed',
      resource_type: 'orientation',
      resource_id: id,
      before,
      after: updated,
    });
    await emit({
      event_type: attended ? EVENT_TYPES.OrientationAttended : EVENT_TYPES.OrientationMissed,
      student_id: updated.student_id,
      payload: { orientation_id: id, attended_at: updated.attended_at?.toISOString() },
    });
    res.json(updated);
  },
);

intakeRouter.get('/funnel', requirePermission(Capabilities.DashboardOpsView), async (_req, res) => {
  const [created, orientated, enrolled, surveyed] = await Promise.all([
    prisma.student.count(),
    prisma.studentFlags.count({ where: { orientation_complete_flag: true } }),
    prisma.moodleEnrollmentStatus.count({ where: { enrolled: true } }),
    prisma.postOrientationSurvey.count({ where: { submitted_at: { not: null } } }),
  ]);
  res.json({ created, orientated, enrolled, surveyed });
});
