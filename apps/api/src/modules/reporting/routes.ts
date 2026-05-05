import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../core/db/prisma.js';
import { requireAuth } from '../../http/middleware/auth.js';
import { requirePermission } from '../../http/middleware/rbac.js';
import { Capabilities } from '../../core/rbac/capabilities.js';
import { validate } from '../../http/middleware/validate.js';
import { toCsv } from './csv.js';

export const reportingRouter: Router = Router();
reportingRouter.use(requireAuth);

const FilterQuery = z.object({
  campus_id: z.string().uuid().optional(),
  program_id: z.string().uuid().optional(),
  cohort_intake_from: z.string().optional(),
  cohort_intake_to: z.string().optional(),
});

reportingRouter.get(
  '/kpi/overview',
  requirePermission(Capabilities.DashboardKpiView),
  validate({ query: FilterQuery }),
  async (req, res) => {
    const q = req.query as unknown as z.infer<typeof FilterQuery>;
    const where = {
      campus_id: q.campus_id,
      program_id: q.program_id,
      intake_date:
        q.cohort_intake_from || q.cohort_intake_to
          ? {
              gte: q.cohort_intake_from ? new Date(q.cohort_intake_from) : undefined,
              lte: q.cohort_intake_to ? new Date(q.cohort_intake_to) : undefined,
            }
          : undefined,
      deleted_at: null,
    };
    const [total, atRisk, withdrawn, graduated, onboardingComplete] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.count({ where: { ...where, flags: { at_risk_flag: true } } }),
      prisma.student.count({ where: { ...where, status: 'withdrawn' } }),
      prisma.student.count({ where: { ...where, status: 'graduated' } }),
      prisma.student.count({ where: { ...where, flags: { orientation_complete_flag: true } } }),
    ]);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const ninetyDayCohort = await prisma.student.count({
      where: { ...where, intake_date: { lte: ninetyDaysAgo } },
    });
    const ninetyDayActive = await prisma.student.count({
      where: {
        ...where,
        intake_date: { lte: ninetyDaysAgo },
        status: { notIn: ['withdrawn'] },
      },
    });
    const retention90 = ninetyDayCohort === 0 ? 0 : Math.round((ninetyDayActive / ninetyDayCohort) * 100);

    const engagementAvg = await prisma.studentFlags.aggregate({
      _avg: { engagement_score: true },
    });

    res.json({
      total_students: total,
      at_risk_count: atRisk,
      at_risk_pct: total === 0 ? 0 : Math.round((atRisk / total) * 100),
      withdrawn_count: withdrawn,
      graduated_count: graduated,
      onboarding_complete_count: onboardingComplete,
      onboarding_complete_pct: total === 0 ? 0 : Math.round((onboardingComplete / total) * 100),
      retention_90d_pct: retention90,
      engagement_score_avg: Math.round(engagementAvg._avg.engagement_score ?? 0),
    });
  },
);

reportingRouter.get(
  '/kpi/operational',
  requirePermission(Capabilities.DashboardOpsView),
  async (_req, res) => {
    const [openCases, escalations, openInterventions, openTasks] = await Promise.all([
      prisma.case.count({ where: { status: { not: 'closed' } } }),
      prisma.case.count({ where: { status: 'escalated' } }),
      prisma.intervention.count({ where: { status: { in: ['assigned', 'in_progress'] } } }),
      prisma.task.count({ where: { status: { in: ['open', 'in_progress'] } } }),
    ]);
    const byOwner = await prisma.task.groupBy({
      by: ['owner_user_id'],
      where: { status: { in: ['open', 'in_progress'] } },
      _count: { _all: true },
    });
    res.json({ openCases, escalations, openInterventions, openTasks, tasks_by_owner: byOwner });
  },
);

reportingRouter.get(
  '/kpi/surveys',
  requirePermission(Capabilities.DashboardKpiView),
  async (_req, res) => {
    const [sent, submitted, npsAvg] = await Promise.all([
      prisma.postOrientationSurvey.count(),
      prisma.postOrientationSurvey.count({ where: { submitted_at: { not: null } } }),
      prisma.postOrientationSurvey.aggregate({ _avg: { nps_score: true } }),
    ]);
    res.json({
      sent,
      submitted,
      response_rate_pct: sent === 0 ? 0 : Math.round((submitted / sent) * 100),
      nps_avg: Math.round(npsAvg._avg.nps_score ?? 0),
    });
  },
);

reportingRouter.get(
  '/kpi/engagement-heatmap',
  requirePermission(Capabilities.DashboardKpiView),
  async (_req, res) => {
    // Program × week × avg engagement score
    const programs = await prisma.program.findMany({ select: { id: true, name: true } });
    const since = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000);
    const flags = await prisma.studentFlags.findMany({
      where: { last_recomputed_at: { gte: since } },
      include: { student: { select: { program_id: true, intake_date: true } } },
    });
    const heatmap: Record<string, Record<number, { sum: number; n: number }>> = {};
    for (const f of flags) {
      const week = Math.floor(
        (Date.now() - new Date(f.student.intake_date).getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
      const programId = f.student.program_id;
      heatmap[programId] = heatmap[programId] ?? {};
      const cell = heatmap[programId][week] ?? { sum: 0, n: 0 };
      cell.sum += f.engagement_score;
      cell.n += 1;
      heatmap[programId][week] = cell;
    }
    const cells: Array<{ program_id: string; program_name: string; week: number; avg: number }> = [];
    for (const program of programs) {
      const map = heatmap[program.id] ?? {};
      for (const [w, v] of Object.entries(map)) {
        cells.push({
          program_id: program.id,
          program_name: program.name,
          week: Number(w),
          avg: v.n === 0 ? 0 : Math.round(v.sum / v.n),
        });
      }
    }
    res.json({ cells });
  },
);

reportingRouter.get(
  '/exports/students.csv',
  requirePermission(Capabilities.ReportsExportScoped),
  async (_req, res) => {
    const rows = await prisma.student.findMany({
      include: { flags: true, program: { select: { name: true } }, campus: { select: { name: true } } },
      take: 5000,
    });
    const flat = rows.map((r) => ({
      id: r.id,
      external_id: r.student_external_id,
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      campus: r.campus.name,
      program: r.program.name,
      status: r.status,
      at_risk: r.flags?.at_risk_flag,
      risk_score: r.flags?.risk_score,
      engagement_tier: r.flags?.engagement_tier,
      engagement_score: r.flags?.engagement_score,
      intake_date: r.intake_date.toISOString().slice(0, 10),
    }));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    res.send(toCsv(flat));
  },
);
