// Phase 0 stub. Real implementation lands in Phase 4 (Module 3 — Early Alert & Risk).

export type RiskInputs = {
  grade_below_threshold: boolean;
  missing_grades_overdue: boolean;
  attendance_below_threshold: boolean;
  no_attendance_recorded: boolean;
  esl_below_threshold: boolean;
  age_gte_65: boolean;
  withdrawal_initiated: boolean;
};

export type RiskWeights = {
  grade_below_threshold: number;
  missing_grades_overdue: number;
  attendance_below_threshold: number;
  no_attendance_recorded: number;
  esl_below_threshold: number;
  age_gte_65: number;
  withdrawal_initiated: number;
};

export const DEFAULT_RISK_WEIGHTS: RiskWeights = {
  grade_below_threshold: 40,
  missing_grades_overdue: 20,
  attendance_below_threshold: 25,
  no_attendance_recorded: 15,
  esl_below_threshold: 10,
  age_gte_65: 10,
  withdrawal_initiated: 50,
};

export const DEFAULT_RISK_FLAG_THRESHOLD = 50;

export function computeRiskScore(
  inputs: RiskInputs,
  weights: RiskWeights = DEFAULT_RISK_WEIGHTS,
): number {
  let score = 0;
  for (const key of Object.keys(weights) as (keyof RiskWeights)[]) {
    if (inputs[key]) score += weights[key];
  }
  return score;
}

export function shouldFlagAtRisk(
  inputs: RiskInputs,
  score: number,
  threshold = DEFAULT_RISK_FLAG_THRESHOLD,
): boolean {
  if (inputs.withdrawal_initiated) return true;
  if (inputs.grade_below_threshold) return true;
  if (inputs.attendance_below_threshold) return true;
  return score >= threshold;
}
