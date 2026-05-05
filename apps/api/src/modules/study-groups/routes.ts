import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';
import { emit, EVENT_TYPES } from '../../core/events/bus.js';
import { als } from '../../core/async-context.js';

export const studyGroupsRouter: Router = Router();
studyGroupsRouter.use(requireAuth);

studyGroupsRouter.get('/', async (_req, res) => {
  // Row-level scope filters by campus
  const items = await prisma.studyGroup.findMany({
    where: { archived_at: null },
    include: { _count: { select: { members: true } } },
    orderBy: { created_at: 'desc' },
    take: 100,
  });
  res.json({ items });
});

const CreateBody = z.object({
  campus_id: z.string().uuid(),
  course_external_id: z.string().optional(),
  name: z.string().min(3).max(80),
  description: z.string().max(2000).optional(),
  max_members: z.number().int().min(2).max(50).default(8),
  meeting_pattern: z.string().max(200).optional(),
});

studyGroupsRouter.post(
  '/',
  requirePermission(Capabilities.SelfJoinStudyGroup),
  validate({ body: CreateBody }),
  async (req, res) => {
    const ctx = als.getStore();
    const data = req.body as z.infer<typeof CreateBody>;
    const group = await prisma.studyGroup.create({
      data: { ...data, created_by_user_id: ctx!.user_id! },
    });
    // Creator (if a student) auto-joins as leader.
    if (ctx!.scope?.student_id) {
      await prisma.studyGroupMember.create({
        data: { group_id: group.id, student_id: ctx!.scope.student_id, role: 'leader' },
      });
    }
    await emit({
      event_type: EVENT_TYPES.StudyGroupCreated,
      student_id: ctx!.scope?.student_id ?? null,
      payload: { group_id: group.id, campus_id: group.campus_id, name: group.name },
    });
    res.status(201).json(group);
  },
);

studyGroupsRouter.post(
  '/:id/join',
  requirePermission(Capabilities.SelfJoinStudyGroup),
  async (req, res) => {
    const ctx = als.getStore();
    if (!ctx!.scope?.student_id) {
      res.status(403).json({ error: 'no_student_link' });
      return;
    }
    const group = await prisma.studyGroup.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { members: true } } },
    });
    if (!group || group.archived_at) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    if (group._count.members >= group.max_members) {
      res.status(409).json({ error: 'group_full' });
      return;
    }
    const existing = await prisma.studyGroupMember.findUnique({
      where: { group_id_student_id: { group_id: group.id, student_id: ctx!.scope.student_id } },
    });
    if (existing && !existing.left_at) {
      res.status(409).json({ error: 'already_member' });
      return;
    }
    const member = existing
      ? await prisma.studyGroupMember.update({
          where: { id: existing.id },
          data: { left_at: null, joined_at: new Date() },
        })
      : await prisma.studyGroupMember.create({
          data: { group_id: group.id, student_id: ctx!.scope.student_id },
        });
    await emit({
      event_type: EVENT_TYPES.StudyGroupJoined,
      student_id: ctx!.scope.student_id,
      payload: { group_id: group.id },
    });
    res.json(member);
  },
);

studyGroupsRouter.post(
  '/:id/leave',
  requirePermission(Capabilities.SelfJoinStudyGroup),
  async (req, res) => {
    const ctx = als.getStore();
    if (!ctx!.scope?.student_id) {
      res.status(403).json({ error: 'no_student_link' });
      return;
    }
    await prisma.studyGroupMember.updateMany({
      where: { group_id: req.params.id, student_id: ctx!.scope.student_id },
      data: { left_at: new Date() },
    });
    await emit({
      event_type: EVENT_TYPES.StudyGroupLeft,
      student_id: ctx!.scope.student_id,
      payload: { group_id: req.params.id },
    });
    res.status(204).end();
  },
);
