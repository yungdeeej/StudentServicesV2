import { Router } from 'express';
import { prisma } from '../../core/db/prisma.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { als } from '../../core/async-context.js';

export const studentSelfRouter: Router = Router();
studentSelfRouter.use(requireAuth);

function studentIdFromCtx(): string | null {
  const ctx = als.getStore();
  return ctx?.scope?.student_id ?? null;
}

studentSelfRouter.get('/me', requirePermission(Capabilities.SelfRead), async (_req, res) => {
  const id = studentIdFromCtx();
  if (!id) {
    res.status(403).json({ error: 'not_a_student' });
    return;
  }
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      flags: true,
      program: { select: { name: true, passing_grade: true, attendance_threshold: true } },
      campus: { select: { name: true, city: true } },
      coordinator: { select: { id: true, first_name: true, last_name: true, email: true } },
      rep: { select: { id: true, first_name: true, last_name: true, email: true } },
    },
  });
  if (!student) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json(student);
});

studentSelfRouter.get('/grades', requirePermission(Capabilities.SelfRead), async (_req, res) => {
  const id = studentIdFromCtx();
  if (!id) {
    res.status(403).json({ error: 'not_a_student' });
    return;
  }
  const items = await prisma.gradeRecord.findMany({
    where: { student_id: id },
    orderBy: { recorded_at: 'desc' },
    take: 200,
  });
  res.json({ items });
});

studentSelfRouter.get('/attendance', requirePermission(Capabilities.SelfRead), async (_req, res) => {
  const id = studentIdFromCtx();
  if (!id) {
    res.status(403).json({ error: 'not_a_student' });
    return;
  }
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const items = await prisma.attendanceRecord.findMany({
    where: { student_id: id, occurred_at: { gte: since } },
    orderBy: { occurred_at: 'desc' },
    take: 500,
  });
  const total = items.length;
  const present = items.filter((i) => i.present).length;
  res.json({
    items,
    summary: { total, present, pct: total === 0 ? 100 : Math.round((present / total) * 100) },
  });
});

studentSelfRouter.get('/cases', requirePermission(Capabilities.SelfRead), async (_req, res) => {
  const id = studentIdFromCtx();
  if (!id) {
    res.status(403).json({ error: 'not_a_student' });
    return;
  }
  // Students can see their own non-confidential cases.
  const items = await prisma.case.findMany({
    where: { student_id: id, confidential: false },
    orderBy: { opened_at: 'desc' },
  });
  res.json({ items });
});

studentSelfRouter.get('/tasks', requirePermission(Capabilities.SelfRead), async (_req, res) => {
  const id = studentIdFromCtx();
  if (!id) {
    res.status(403).json({ error: 'not_a_student' });
    return;
  }
  const items = await prisma.task.findMany({
    where: { student_id: id, status: { in: ['open', 'in_progress'] } },
    orderBy: [{ priority: 'desc' }, { due_at: 'asc' }],
  });
  res.json({ items });
});
