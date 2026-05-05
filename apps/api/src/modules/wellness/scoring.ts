// PHQ-2 scoring + crisis tier rules.
// PHQ-2 score 3+ is the established cutoff for likely depression
// (Kroenke et al., 2003). Crisis tier triggers an immediate warm handoff.

import type { WellnessRiskTier } from '@prisma/client';

export type WellnessInputs = {
  phq2_q1: number;        // 0-3
  phq2_q2: number;        // 0-3
  stress_score: number;   // 0-10
  free_text?: string;
};

const CRISIS_PHRASES = [
  'kill myself',
  'kill my self',
  'suicide',
  'suicidal',
  'end it all',
  'hurt myself',
  'self harm',
  'self-harm',
  "don't want to be here",
  'want to die',
];

export type WellnessAssessment = {
  phq2_total: number;
  risk_tier: WellnessRiskTier;
  crisis_phrase_hit: boolean;
};

export function assessWellness(inputs: WellnessInputs): WellnessAssessment {
  const phq2_total = clamp(inputs.phq2_q1, 0, 3) + clamp(inputs.phq2_q2, 0, 3);
  const text = (inputs.free_text ?? '').toLowerCase();
  const crisis_phrase_hit = CRISIS_PHRASES.some((p) => text.includes(p));

  let risk_tier: WellnessRiskTier = 'none';
  if (crisis_phrase_hit) risk_tier = 'crisis';
  else if (phq2_total >= 5 || inputs.stress_score >= 9) risk_tier = 'high';
  else if (phq2_total >= 3 || inputs.stress_score >= 7) risk_tier = 'moderate';
  else if (phq2_total >= 1 || inputs.stress_score >= 4) risk_tier = 'low';

  return { phq2_total, risk_tier, crisis_phrase_hit };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}
