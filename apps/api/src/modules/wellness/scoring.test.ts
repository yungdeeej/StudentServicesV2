import { describe, expect, it } from 'vitest';
import { assessWellness } from './scoring.js';

describe('wellness scoring', () => {
  it('returns none for low responses', () => {
    expect(assessWellness({ phq2_q1: 0, phq2_q2: 0, stress_score: 1 })).toEqual({
      phq2_total: 0,
      risk_tier: 'none',
      crisis_phrase_hit: false,
    });
  });

  it('returns moderate at PHQ-2 cutoff (3)', () => {
    const a = assessWellness({ phq2_q1: 2, phq2_q2: 1, stress_score: 4 });
    expect(a.phq2_total).toBe(3);
    expect(a.risk_tier).toBe('moderate');
  });

  it('returns high at PHQ-2 5+', () => {
    const a = assessWellness({ phq2_q1: 3, phq2_q2: 2, stress_score: 4 });
    expect(a.phq2_total).toBe(5);
    expect(a.risk_tier).toBe('high');
  });

  it('returns high at stress >= 9', () => {
    expect(assessWellness({ phq2_q1: 0, phq2_q2: 0, stress_score: 10 }).risk_tier).toBe('high');
  });

  it('clamps inputs out of range', () => {
    const a = assessWellness({ phq2_q1: 99, phq2_q2: -5, stress_score: 4 });
    expect(a.phq2_total).toBe(3);
  });

  it('escalates to crisis on flagged phrase regardless of score', () => {
    const a = assessWellness({
      phq2_q1: 0,
      phq2_q2: 0,
      stress_score: 0,
      free_text: "I keep thinking I want to die.",
    });
    expect(a.crisis_phrase_hit).toBe(true);
    expect(a.risk_tier).toBe('crisis');
  });

  it('does not crisis-flag innocuous text', () => {
    const a = assessWellness({
      phq2_q1: 0,
      phq2_q2: 0,
      stress_score: 0,
      free_text: 'Studying hard for the practicum exam.',
    });
    expect(a.crisis_phrase_hit).toBe(false);
    expect(a.risk_tier).toBe('none');
  });
});
