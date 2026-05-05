import type { PrismaClient } from '@prisma/client';
import { als } from '../async-context.js';

const SCOPED_MODELS = new Set([
  'Student',
  'OrientationRecord',
  'WelcomeCommunication',
  'MoodleEnrollmentStatus',
  'PostOrientationSurvey',
  'ConnectRoom',
  'ConnectRoomAssignment',
  'StudentLeaderAssignment',
  'EventParticipation',
  'NewsletterDelivery',
  'AttendanceRecord',
  'GradeRecord',
  'WithdrawalRecord',
  'RiskAssessment',
  'EarlyAlert',
  'Case',
  'Intervention',
  'ClassAudit',
  'AccommodationRequest',
  'ReentryPlan',
  'PracticumPlacement',
  'Program',
]);

const READ_OPS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

export function applyRowLevelScope(prisma: PrismaClient): void {
  prisma.$use(async (params, next) => {
    const ctx = als.getStore();
    if (!ctx?.scope || ctx.scope.all_campuses) return next(params);
    if (!params.model || !SCOPED_MODELS.has(params.model)) return next(params);
    if (!READ_OPS.has(params.action)) return next(params);

    const allowedCampuses = ctx.scope.campus_ids;
    if (allowedCampuses.length === 0) {
      // No campus access at all → empty result for reads
      if (params.action === 'count') return 0;
      if (params.action === 'findMany') return [];
      if (params.action === 'aggregate' || params.action === 'groupBy') return [];
      return null;
    }

    const where = (params.args?.where ?? {}) as Record<string, unknown>;
    const scopeFilter = scopeFilterFor(params.model, allowedCampuses);
    const merged = mergeWhere(where, scopeFilter);
    params.args = { ...(params.args ?? {}), where: merged };
    return next(params);
  });
}

function scopeFilterFor(model: string, campuses: string[]) {
  // Models with their own campus_id
  if (model === 'Student' || model === 'Program' || model === 'ConnectRoom') {
    return { campus_id: { in: campuses } };
  }
  // Otherwise nest through `student.campus_id`
  return { student: { campus_id: { in: campuses } } };
}

function mergeWhere(
  existing: Record<string, unknown>,
  injected: Record<string, unknown>,
): Record<string, unknown> {
  const ANDs: unknown[] = [];
  if (Array.isArray(existing.AND)) ANDs.push(...existing.AND);
  else if (Object.keys(existing).length > 0) ANDs.push(existing);
  ANDs.push(injected);
  return { AND: ANDs };
}
