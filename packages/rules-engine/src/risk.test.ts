import { describe, expect, it } from 'vitest';
import {
  computeRiskScore,
  shouldFlagAtRisk,
  DEFAULT_RISK_WEIGHTS,
} from './risk.js';

const baseInputs = {
  grade_below_threshold: false,
  missing_grades_overdue: false,
  attendance_below_threshold: false,
  no_attendance_recorded: false,
  esl_below_threshold: false,
  age_gte_65: false,
  withdrawal_initiated: false,
};

describe('risk', () => {
  it('returns 0 when nothing is wrong', () => {
    expect(computeRiskScore(baseInputs)).toBe(0);
    expect(shouldFlagAtRisk(baseInputs, 0)).toBe(false);
  });

  it('adds the documented weights', () => {
    const score = computeRiskScore({
      ...baseInputs,
      grade_below_threshold: true,
      attendance_below_threshold: true,
    });
    expect(score).toBe(DEFAULT_RISK_WEIGHTS.grade_below_threshold + DEFAULT_RISK_WEIGHTS.attendance_below_threshold);
  });

  it('auto-flags on withdrawal regardless of total', () => {
    const inputs = { ...baseInputs, withdrawal_initiated: true };
    expect(shouldFlagAtRisk(inputs, 0)).toBe(true);
  });

  it('flags at the threshold', () => {
    expect(shouldFlagAtRisk(baseInputs, 50)).toBe(true);
    expect(shouldFlagAtRisk(baseInputs, 49)).toBe(false);
  });

  it('flags on grade-below hard rule even if score would not', () => {
    const inputs = { ...baseInputs, grade_below_threshold: true };
    expect(shouldFlagAtRisk(inputs, 10)).toBe(true);
  });
});
