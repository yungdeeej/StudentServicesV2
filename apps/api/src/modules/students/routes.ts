import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { audit } from '../../core/audit.js';
import { emit, EVENT_TYPES } from '../../core/events/bus.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';

export const studentsRouter: Router = Router();
studentsRouter.use(requireAuth);

const ListQuery = z.object({
  campus_id: z.string().uuid().optional(),
  program_id: z.string().uuid().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
});

studentsRouter.get(
  '/',
  requirePermission(Capabilities.StudentRead),
  validate({ query: ListQuery }),
  async (req, res) => {
    const q = req.query as unknown as z.infer<typeof ListQuery>;
    const where = {
      campus_id: q.campus_id,
      program_id: q.program_id,
      status: q.status as never,
      deleted_at: null,
    };
    const [items, total] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (q.page - 1) * q.page_size,
        take: q.page_size,
        include: { flags: true },
      }),
      prisma.student.count({ where }),
    ]);
    res.json({ items, total, page: q.page, page_size: q.page_size });
  },
);

studentsRouter.get(
  '/:id',
  requirePermission(Capabilities.StudentRead),
  async (req, res) => {
    const id = req.params.id;
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        flags: true,
        program: true,
        campus: true,
        coordinator: true,
        rep: true,
        cases: { where: { status: { not: 'closed' } } },
        risk_assessments: { take: 30, orderBy: { computed_at: 'desc' } },
      },
    });
    if (!student) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(student);
  },
);

const CreateBody = z.object({
  student_external_id: z.string().min(1),
  sis_source: z.enum(['campuslogin', 'salesforce']),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  dob: z.string(),
  program_id: z.string().uuid(),
  campus_id: z.string().uuid(),
  entity_id: z.string().uuid(),
  intake_date: z.string(),
});

studentsRouter.post(
  '/',
  requirePermission(Capabilities.StudentUpdate),
  validate({ body: CreateBody }),
  async (req, res) => {
    const data = req.body as z.infer<typeof CreateBody>;
    const student = await prisma.student.create({
      data: {
        ...data,
        dob: new Date(data.dob),
        intake_date: new Date(data.intake_date),
        flags: { create: {} },
      },
    });
    void audit({
      action: 'student.created',
      resource_type: 'student',
      resource_id: student.id,
      after: student,
      campus_id: student.campus_id,
    });
    await emit({
      event_type: EVENT_TYPES.StudentCreated,
      student_id: student.id,
      payload: {
        student_external_id: student.student_external_id,
        sis_source: student.sis_source,
        campus_id: student.campus_id,
        entity_id: student.entity_id,
        program_id: student.program_id,
        intake_date: student.intake_date.toISOString(),
      },
    });
    res.status(201).json(student);
  },
);

const StatusBody = z.object({
  status: z.enum([
    'start',
    'stay',
    'at_risk',
    'withdrawn',
    'on_practicum',
    'graduated',
    're_entry',
    'alumni',
  ]),
  reason: z.string().optional(),
});

studentsRouter.post(
  '/:id/status',
  requirePermission(Capabilities.StudentUpdate),
  validate({ body: StatusBody }),
  async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof StatusBody>;
    const before = await prisma.student.findUnique({ where: { id } });
    if (!before) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const after = await prisma.student.update({ where: { id }, data: { status: body.status } });
    void audit({
      action: 'student.status_changed',
      resource_type: 'student',
      resource_id: id,
      before,
      after,
      campus_id: after.campus_id,
    });
    await emit({
      event_type: EVENT_TYPES.StudentStatusChanged,
      student_id: id,
      payload: { from: before.status, to: after.status, reason: body.reason },
    });
    res.json(after);
  },
);
