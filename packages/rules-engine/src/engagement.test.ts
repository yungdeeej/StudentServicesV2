import { describe, expect, it } from 'vitest';
import { computeEngagementScore, tierForScore, DEFAULT_ENGAGEMENT_WEIGHTS } from './engagement.js';

describe('engagement', () => {
  it('computes the weighted score', () => {
    const score = computeEngagementScore({
      event_attendance_pct: 80,
      newsletter_open_rate: 60,
      connect_room_activity_score: 50,
      outreach_response_rate: 40,
    });
    // 0.30*80 + 0.25*60 + 0.25*50 + 0.20*40 = 24 + 15 + 12.5 + 8 = 59.5
    expect(score).toBeCloseTo(59.5, 1);
  });

  it('respects custom weights', () => {
    const score = computeEngagementScore(
      {
        event_attendance_pct: 100,
        newsletter_open_rate: 0,
        connect_room_activity_score: 0,
        outreach_response_rate: 0,
      },
      { event_attendance: 1, newsletter_open: 0, connect_room: 0, outreach: 0 },
    );
    expect(score).toBe(100);
  });

  it('tiers correctly', () => {
    expect(tierForScore(80)).toBe('high');
    expect(tierForScore(50)).toBe('medium');
    expect(tierForScore(10)).toBe('low');
  });

  it('uses default weights export', () => {
    expect(DEFAULT_ENGAGEMENT_WEIGHTS.event_attendance).toBe(0.3);
  });
});
