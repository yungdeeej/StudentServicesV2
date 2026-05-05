// Phase 0 stub. Real implementation lands in Phase 3 (Module 2 — Engagement).
// Kept here so the package compiles and the contract is visible.

export type EngagementInputs = {
  event_attendance_pct: number;
  newsletter_open_rate: number;
  connect_room_activity_score: number;
  outreach_response_rate: number;
};

export type EngagementWeights = {
  event_attendance: number;
  newsletter_open: number;
  connect_room: number;
  outreach: number;
};

export const DEFAULT_ENGAGEMENT_WEIGHTS: EngagementWeights = {
  event_attendance: 0.3,
  newsletter_open: 0.25,
  connect_room: 0.25,
  outreach: 0.2,
};

export type EngagementTier = 'high' | 'medium' | 'low';

export function computeEngagementScore(
  inputs: EngagementInputs,
  weights: EngagementWeights = DEFAULT_ENGAGEMENT_WEIGHTS,
): number {
  return (
    weights.event_attendance * inputs.event_attendance_pct +
    weights.newsletter_open * inputs.newsletter_open_rate +
    weights.connect_room * inputs.connect_room_activity_score +
    weights.outreach * inputs.outreach_response_rate
  );
}

export function tierForScore(
  score: number,
  thresholds: { high: number; medium: number } = { high: 70, medium: 40 },
): EngagementTier {
  if (score >= thresholds.high) return 'high';
  if (score >= thresholds.medium) return 'medium';
  return 'low';
}
