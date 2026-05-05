import type { PrismaClient } from '@prisma/client';
import { als } from '../async-context.js';
import { roleHasCapability, Capabilities } from './capabilities.js';

const SCOPED_BY_CAMPUS = new Set([
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

  'MessageThread',
  'Appointment',
  'StudentDocument',
  'WellnessCheckin',
  'TutoringRequest',
  'StudyGroup',
  'StudyGroupMember',
  'BookableResource',
  'ResourceBooking',
  'Course',
  'CourseEnrollment',
  'TranscriptRequest',
]);

// Models scoped purely by student (no separate campus column on the row)
const SCOPED_BY_STUDENT = new Set([
  'MessageThread',
  'Appointment',
  'StudentDocument',
  'WellnessCheckin',
  'TutoringRequest',
  'StudyGroupMember',
  'ResourceBooking',
  'CourseEnrollment',
  'TranscriptRequest',
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
    if (!ctx?.scope || !ctx.role) return next(params);
    if (!params.model || !SCOPED_BY_CAMPUS.has(params.model)) return next(params);
    if (!READ_OPS.has(params.action)) return next(params);

    const where = (params.args?.where ?? {}) as Record<string, unknown>;
    const filters: Record<string, unknown>[] = [];

    // Student role: lock to own row.
    if (ctx.role === 'student' && ctx.scope.student_id) {
      filters.push(studentSelfFilter(params.model, ctx.scope.student_id));
    } else if (!ctx.scope.all_campuses) {
      const campuses = ctx.scope.campus_ids;
      if (campuses.length === 0) return emptyResult(params.action);
      filters.push(campusFilter(params.model, campuses));
    }

    // Confidential case lock — even managers without the capability
    // cannot read confidential cases.
    if (params.model === 'Case' && !roleHasCapability(ctx.role, Capabilities.CaseConfidentialAccess)) {
      filters.push({ confidential: false });
    }
    if (params.model === 'MessageThread' && !roleHasCapability(ctx.role, Capabilities.CaseConfidentialAccess)) {
      // Confidential threads are wellness-related and counselor-only.
      filters.push({ OR: [{ confidential: false }, ...(ctx.scope.student_id ? [{ student_id: ctx.scope.student_id }] : [])] });
    }

    params.args = { ...(params.args ?? {}), where: mergeWhere(where, filters) };
    return next(params);
  });
}

function emptyResult(action: string): unknown {
  if (action === 'count') return 0;
  if (action === 'findMany' || action === 'aggregate' || action === 'groupBy') return [];
  return null;
}

function campusFilter(model: string, campuses: string[]): Record<string, unknown> {
  if (model === 'Student' || model === 'Program' || model === 'ConnectRoom' || model === 'BookableResource' || model === 'Course' || model === 'StudyGroup') {
    return { campus_id: { in: campuses } };
  }
  return { student: { campus_id: { in: campuses } } };
}

function studentSelfFilter(model: string, student_id: string): Record<string, unknown> {
  if (model === 'Student') return { id: student_id };
  if (SCOPED_BY_STUDENT.has(model)) return { student_id };
  // Anything else falls back to nested-student filter.
  return { student: { id: student_id } };
}

function mergeWhere(
  existing: Record<string, unknown>,
  injected: Record<string, unknown>[],
): Record<string, unknown> {
  const ANDs: unknown[] = [];
  if (Array.isArray(existing.AND)) ANDs.push(...existing.AND);
  else if (Object.keys(existing).length > 0) ANDs.push(existing);
  for (const f of injected) ANDs.push(f);
  return { AND: ANDs };
}
