import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { audit } from '../../core/audit.js';
import { emit, EVENT_TYPES } from '../../core/events/bus.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities, roleHasCapability } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';
import { als } from '../../core/async-context.js';

export const documentsRouter: Router = Router();
documentsRouter.use(requireAuth);

// Upload metadata. The actual binary is uploaded to object storage (S3/Replit
// blob/etc.) using a presigned URL; the client posts the resulting storage_url
// here. This keeps the API server out of the binary path.
const UploadBody = z.object({
  student_id: z.string().uuid().optional(),
  kind: z.enum(['id', 'transcript', 'accommodation', 'enrollment_agreement', 'reentry_doc', 'other']),
  filename: z.string().min(1).max(255),
  storage_url: z.string().url(),
  mime_type: z.string().max(120),
  size_bytes: z.number().int().positive().max(50 * 1024 * 1024), // 50MB cap
});

documentsRouter.post('/', validate({ body: UploadBody }), async (req, res) => {
  const ctx = als.getStore();
  const body = req.body as z.infer<typeof UploadBody>;
  const role = ctx!.role!;
  let studentId: string | undefined = body.student_id;
  if (role === 'student') {
    if (!ctx!.scope?.student_id) {
      res.status(403).json({ error: 'no_student_link' });
      return;
    }
    studentId = ctx!.scope.student_id;
  } else if (!studentId) {
    res.status(400).json({ error: 'student_id_required' });
    return;
  }
  if (role === 'student' && !roleHasCapability(role, Capabilities.SelfUploadDocument)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const doc = await prisma.studentDocument.create({
    data: { ...body, student_id: studentId, uploaded_by_id: ctx!.user_id! },
  });
  await emit({
    event_type: EVENT_TYPES.DocumentUploaded,
    student_id: studentId,
    payload: { document_id: doc.id, kind: doc.kind, filename: doc.filename },
  });
  void audit({ action: 'document.uploaded', resource_type: 'document', resource_id: doc.id });
  res.status(201).json(doc);
});

documentsRouter.get('/', async (req, res) => {
  void req;
  const ctx = als.getStore();
  // Students see only their own; staff see anything they're scoped to.
  const items = await prisma.studentDocument.findMany({
    where: ctx!.role === 'student' ? { student_id: ctx!.scope!.student_id ?? undefined } : {},
    orderBy: { uploaded_at: 'desc' },
    take: 200,
  });
  res.json({ items });
});

const ReviewBody = z.object({
  status: z.enum(['under_review', 'approved', 'rejected', 'expired']),
  reviewer_notes: z.string().optional(),
});

documentsRouter.post(
  '/:id/review',
  requirePermission(Capabilities.DocumentReview),
  validate({ body: ReviewBody }),
  async (req, res) => {
    const id = req.params.id;
    const body = req.body as z.infer<typeof ReviewBody>;
    const before = await prisma.studentDocument.findUnique({ where: { id } });
    if (!before) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const updated = await prisma.studentDocument.update({
      where: { id },
      data: { status: body.status, reviewer_notes: body.reviewer_notes, reviewed_at: new Date() },
    });
    await emit({
      event_type: EVENT_TYPES.DocumentReviewed,
      student_id: before.student_id,
      payload: { document_id: id, status: body.status },
    });
    void audit({ action: 'document.reviewed', resource_type: 'document', resource_id: id, before, after: updated });
    res.json(updated);
  },
);
