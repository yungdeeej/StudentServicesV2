import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';
import { draftNudgeFor, isAiEnabled, setAiKillSwitch, summarizeRiskFor } from './service.js';

export const aiRouter: Router = Router();
aiRouter.use(requireAuth);

aiRouter.get(
  '/students/:id/risk-summary',
  requirePermission(Capabilities.StudentRead),
  async (req, res) => {
    const summary = await summarizeRiskFor(req.params.id);
    res.json(summary);
  },
);

const NudgeBody = z.object({ context: z.string().min(1) });

aiRouter.post(
  '/students/:id/nudge',
  requirePermission(Capabilities.StudentUpdate),
  validate({ body: NudgeBody }),
  async (req, res) => {
    const draft = await draftNudgeFor({
      student_id: req.params.id,
      context: (req.body as { context: string }).context,
    });
    res.json(draft);
  },
);

const KillSwitchBody = z.object({ enabled: z.boolean() });

aiRouter.post(
  '/admin/kill-switch',
  requirePermission(Capabilities.AutomationRulesEdit),
  validate({ body: KillSwitchBody }),
  async (req, res) => {
    setAiKillSwitch(!(req.body as z.infer<typeof KillSwitchBody>).enabled);
    res.json({ enabled: isAiEnabled() });
  },
);
