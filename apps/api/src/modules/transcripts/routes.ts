import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';
import { emit, EVENT_TYPES } from '../../core/events/bus.js';
import { als } from '../../core/async-context.js';
import { getIntegrations } from '../../integrations/factory.js';

export const transcriptsRouter: Router = Router();
transcriptsRouter.use(requireAuth);

const RequestBody = z.object({
  recipient_name: z.string().min(1).max(120),
  recipient_email: z.string().email(),
  notes: z.string().max(2000).optional(),
});

transcriptsRouter.post(
  '/me',
  requirePermission(Capabilities.SelfTranscriptRequest),
  validate({ body: RequestBody }),
  async (req, res) => {
    const ctx = als.getStore();
    const studentId = ctx!.scope?.student_id;
    if (!studentId) {
      res.status(403).json({ error: 'no_student_link' });
      return;
    }
    const body = req.body as z.infer<typeof RequestBody>;
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      res.status(404).json({ error: 'student_not_found' });
      return;
    }
    let pandadoc_ref: string | undefined;
    try {
      const integrations = getIntegrations();
      const doc = await integrations.pandadoc.createDocument({
        template: 'transcript_release',
        recipient_email: student.email,
        vars: {
          student_name: `${student.first_name} ${student.last_name}`,
          student_external_id: student.student_external_id,
          recipient_name: body.recipient_name,
          recipient_email: body.recipient_email,
        },
      });
      pandadoc_ref = doc.external_id;
    } catch {
      // PandaDoc adapter is mock by default — request still goes through.
    }
    const reqRow = await prisma.transcriptRequest.create({
      data: {
        student_id: studentId,
        recipient_name: body.recipient_name,
        recipient_email: body.recipient_email,
        notes: body.notes,
        status: pandadoc_ref ? 'pending_signature' : 'draft',
        pandadoc_ref,
      },
    });
    await emit({
      event_type: EVENT_TYPES.TranscriptRequested,
      student_id: studentId,
      payload: { request_id: reqRow.id, recipient_email: reqRow.recipient_email },
    });
    res.status(201).json(reqRow);
  },
);

transcriptsRouter.get(
  '/me',
  requirePermission(Capabilities.SelfTranscriptRequest),
  async (_req, res) => {
    const ctx = als.getStore();
    const studentId = ctx!.scope?.student_id;
    if (!studentId) {
      res.status(403).json({ error: 'no_student_link' });
      return;
    }
    const items = await prisma.transcriptRequest.findMany({
      where: { student_id: studentId },
      orderBy: { requested_at: 'desc' },
    });
    res.json({ items });
  },
);
