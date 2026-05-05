import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';
import { emit, EVENT_TYPES } from '../../core/events/bus.js';
import { als } from '../../core/async-context.js';

export const coursesRouter: Router = Router();
coursesRouter.use(requireAuth);

const ListQuery = z.object({
  campus_id: z.string().uuid().optional(),
  q: z.string().optional(),
});

coursesRouter.get(
  '/',
  requirePermission(Capabilities.SelfCourseView),
  validate({ query: ListQuery }),
  async (req, res) => {
    const q = req.query as unknown as z.infer<typeof ListQuery>;
    const items = await prisma.course.findMany({
      where: {
        active: true,
        ...(q.campus_id ? { campus_id: q.campus_id } : {}),
        ...(q.q
          ? {
              OR: [
                { name: { contains: q.q, mode: 'insensitive' } },
                { code: { contains: q.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        prerequisites: { include: { requires_course: { select: { id: true, code: true, name: true } } } },
      },
      orderBy: [{ code: 'asc' }],
      take: 200,
    });
    res.json({ items });
  },
);

coursesRouter.get(
  '/me/enrollments',
  requirePermission(Capabilities.SelfCourseView),
  async (_req, res) => {
    const ctx = als.getStore();
    const id = ctx!.scope?.student_id;
    if (!id) {
      res.status(403).json({ error: 'no_student_link' });
      return;
    }
    const items = await prisma.courseEnrollment.findMany({
      where: { student_id: id },
      include: { course: true },
      orderBy: { enrolled_at: 'desc' },
    });
    res.json({ items });
  },
);

const EnrollBody = z.object({
  course_id: z.string().uuid(),
  term: z.string().max(20).optional(),
});

// Self-enrollment marks intent only — the SIS is the ultimate source of truth.
coursesRouter.post(
  '/me/enrollments',
  requirePermission(Capabilities.SelfCourseView),
  validate({ body: EnrollBody }),
  async (req, res) => {
    const ctx = als.getStore();
    const id = ctx!.scope?.student_id;
    if (!id) {
      res.status(403).json({ error: 'no_student_link' });
      return;
    }
    const body = req.body as z.infer<typeof EnrollBody>;

    // Prerequisite check
    const course = await prisma.course.findUnique({
      where: { id: body.course_id },
      include: { prerequisites: true },
    });
    if (!course) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const completed = await prisma.courseEnrollment.findMany({
      where: { student_id: id, status: 'completed' },
      select: { course_id: true },
    });
    const completedSet = new Set(completed.map((c) => c.course_id));
    const missing = course.prerequisites.filter((p) => !completedSet.has(p.requires_course_id));
    if (missing.length > 0) {
      res.status(409).json({ error: 'missing_prerequisites', missing });
      return;
    }

    const enrollment = await prisma.courseEnrollment.upsert({
      where: {
        course_id_student_id_term: {
          course_id: body.course_id,
          student_id: id,
          term: body.term ?? '',
        },
      },
      update: { status: 'prospective' },
      create: { course_id: body.course_id, student_id: id, term: body.term, status: 'prospective' },
    });
    await emit({
      event_type: EVENT_TYPES.CourseEnrolled,
      student_id: id,
      payload: { course_id: body.course_id, enrollment_id: enrollment.id },
    });
    res.status(201).json(enrollment);
  },
);

coursesRouter.post(
  '/me/enrollments/:id/drop',
  requirePermission(Capabilities.SelfCourseView),
  async (req, res) => {
    const ctx = als.getStore();
    const id = ctx!.scope?.student_id;
    if (!id) {
      res.status(403).json({ error: 'no_student_link' });
      return;
    }
    const enrollment = await prisma.courseEnrollment.findUnique({ where: { id: req.params.id } });
    if (!enrollment || enrollment.student_id !== id) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const updated = await prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: { status: 'dropped', ended_at: new Date() },
    });
    await emit({
      event_type: EVENT_TYPES.CourseDropped,
      student_id: id,
      payload: { enrollment_id: updated.id, course_id: updated.course_id },
    });
    res.json(updated);
  },
);
