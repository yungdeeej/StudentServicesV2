import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';
import { audit } from '../../core/audit.js';

export const resourcesRouter: Router = Router();
resourcesRouter.use(requireAuth);

const ListQuery = z.object({
  topic: z.string().optional(),
  kind: z.string().optional(),
  q: z.string().optional(),
  language: z.string().default('en'),
});

resourcesRouter.get('/', validate({ query: ListQuery }), async (req, res) => {
  const q = req.query as unknown as z.infer<typeof ListQuery>;
  const items = await prisma.resource.findMany({
    where: {
      topic: q.topic as never,
      kind: q.kind as never,
      language: q.language,
      OR: q.q
        ? [{ title: { contains: q.q, mode: 'insensitive' } }, { tags: { has: q.q } }]
        : undefined,
    },
    orderBy: { published_at: 'desc' },
    take: 100,
  });
  res.json({ items });
});

const CreateBody = z.object({
  kind: z.enum(['article', 'video', 'pdf', 'external_link', 'hotline']),
  topic: z.enum(['mental_health', 'study_skills', 'time_management', 'technology', 'attendance', 'practicum', 'general']),
  title: z.string().min(1).max(200),
  body_md: z.string().optional(),
  url: z.string().url().optional(),
  campus_scope: z.array(z.string().uuid()).default([]),
  tags: z.array(z.string()).default([]),
  language: z.string().default('en'),
  is_crisis: z.boolean().default(false),
});

resourcesRouter.post(
  '/',
  requirePermission(Capabilities.ResourcePublish),
  validate({ body: CreateBody }),
  async (req, res) => {
    const data = req.body as z.infer<typeof CreateBody>;
    const row = await prisma.resource.create({ data });
    void audit({ action: 'resource.published', resource_type: 'resource', resource_id: row.id });
    res.status(201).json(row);
  },
);

resourcesRouter.delete(
  '/:id',
  requirePermission(Capabilities.ResourcePublish),
  async (req, res) => {
    await prisma.resource.delete({ where: { id: req.params.id } });
    res.status(204).end();
  },
);
