import { prisma } from './db/prisma.js';
import {
  computeRiskScore,
  shouldFlagAtRisk,
  computeEngagementScore,
  tierForScore,
  DEFAULT_RISK_WEIGHTS,
  DEFAULT_ENGAGEMENT_WEIGHTS,
  DEFAULT_RISK_FLAG_THRESHOLD,
} from '@mcg/rules-engine';
import { emit } from './events/bus.js';
import { EVENT_TYPES } from './events/types.js';

export async function recomputeFlags(student_id: string): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: student_id },
    include: { program: true, flags: true },
  });
  if (!student) return;

  const [latestGrades, attendance, withdrawals] = await Promise.all([
    prisma.gradeRecord.findMany({
      where: { student_id },
      orderBy: { recorded_at: 'desc' },
      take: 10,
    }),
    prisma.attendanceRecord.findMany({
      where: {
        student_id,
        occurred_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.withdrawalRecord.findMany({ where: { student_id } }),
  ]);

  const passing = student.program.passing_grade;
  const grade_below = latestGrades.some((g) => g.value < passing);
  const present = attendance.filter((a) => a.present).length;
  const total = attendance.length;
  const attendance_pct = total === 0 ? 100 : Math.round((present / total) * 100);
  const attendance_below = total > 0 && attendance_pct < student.program.attendance_threshold;
  const no_attendance = total === 0;
  const age = ageFromDob(student.dob);

  const riskInputs = {
    grade_below_threshold: grade_below,
    missing_grades_overdue: false,
    attendance_below_threshold: attendance_below,
    no_attendance_recorded: no_attendance,
    esl_below_threshold: false,
    age_gte_65: age >= 65,
    withdrawal_initiated: withdrawals.length > 0,
  };

  const score = computeRiskScore(riskInputs, DEFAULT_RISK_WEIGHTS);
  const flag = shouldFlagAtRisk(riskInputs, score, DEFAULT_RISK_FLAG_THRESHOLD);

  // Engagement (cheap version — full version computed in module 2)
  const inputs = {
    event_attendance_pct: 0,
    newsletter_open_rate: 0,
    connect_room_activity_score: 0,
    outreach_response_rate: 0,
  };
  const engagement = Math.round(computeEngagementScore(inputs, DEFAULT_ENGAGEMENT_WEIGHTS));
  const tier = tierForScore(engagement);

  const before = student.flags;
  const updated = await prisma.studentFlags.upsert({
    where: { student_id },
    update: {
      at_risk_flag: flag,
      risk_score: score,
      engagement_score: engagement,
      engagement_tier: tier,
      last_recomputed_at: new Date(),
    },
    create: {
      student_id,
      at_risk_flag: flag,
      risk_score: score,
      engagement_score: engagement,
      engagement_tier: tier,
    },
  });

  await prisma.riskAssessment.create({
    data: {
      student_id,
      risk_score: score,
      flagged: flag,
      top_factors: factorsFor(riskInputs),
      rule_versions: ['v1'],
    },
  });

  if (flag && !before?.at_risk_flag) {
    await emit({
      event_type: EVENT_TYPES.RiskFlagged,
      student_id,
      payload: { risk_score: score, top_factors: factorsFor(riskInputs), rule_versions: ['v1'] },
    });
  } else if (!flag && before?.at_risk_flag) {
    await emit({
      event_type: EVENT_TYPES.RiskCleared,
      student_id,
      payload: { risk_score: score },
    });
  }

  void updated;
}

function factorsFor(i: {
  grade_below_threshold: boolean;
  attendance_below_threshold: boolean;
  no_attendance_recorded: boolean;
  withdrawal_initiated: boolean;
  age_gte_65: boolean;
}): string[] {
  const out: string[] = [];
  if (i.withdrawal_initiated) out.push('withdrawal_initiated');
  if (i.grade_below_threshold) out.push('grade_below_threshold');
  if (i.attendance_below_threshold) out.push('attendance_below_threshold');
  if (i.no_attendance_recorded) out.push('no_attendance_recorded');
  if (i.age_gte_65) out.push('age_gte_65');
  return out;
}

function ageFromDob(dob: Date): number {
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}
