import type { Health, IClaudeAdapter } from '../types.js';
import { loadEnv } from '../../core/config/env.js';

export class ClaudeMockAdapter implements IClaudeAdapter {
  async health(): Promise<Health> {
    return { ok: true, latency_ms: 1, detail: 'mock' };
  }
  async summarizeRisk(args: {
    student_id: string;
    risk_score: number;
    timeline: Array<{ event_type: string; occurred_at: string; payload?: unknown }>;
  }): Promise<{ predicted_risk: number; top_factors: string[]; recommended_action: string }> {
    return {
      predicted_risk: Math.min(1, args.risk_score / 100),
      top_factors: args.timeline
        .slice(-3)
        .map((e) => e.event_type)
        .reverse(),
      recommended_action:
        'Schedule a 15-minute check-in this week and confirm attendance + outstanding assessments.',
    };
  }
  async draftNudge(args: {
    student_first_name: string;
    context: string;
    voice_sample?: string;
  }): Promise<{ draft: string }> {
    void args.voice_sample;
    return {
      draft: `Hi ${args.student_first_name}, just checking in — ${args.context}. Let me know how you're doing or if you need anything from us.`,
    };
  }
  async analyzeSentiment(args: { text: string }): Promise<{
    label: 'positive' | 'neutral' | 'negative' | 'distressed';
    score: number;
    crisis_signal: boolean;
    rationale?: string;
  }> {
    const text = args.text.toLowerCase();
    const distressKeywords = ['hopeless', "can't cope", 'cant cope', 'overwhelmed', 'breakdown', 'panic'];
    const crisisKeywords = ['kill myself', 'suicide', 'self harm', 'self-harm', 'want to die'];
    const positiveKeywords = ['thanks', 'thank you', 'grateful', 'great', 'love', 'awesome'];
    const negativeKeywords = ['frustrated', 'angry', 'upset', 'unfair', 'failing', 'stressed'];
    const crisis_signal = crisisKeywords.some((k) => text.includes(k));
    if (crisis_signal) return { label: 'distressed', score: -1, crisis_signal: true };
    if (distressKeywords.some((k) => text.includes(k))) return { label: 'distressed', score: -0.8, crisis_signal: false };
    if (negativeKeywords.some((k) => text.includes(k))) return { label: 'negative', score: -0.4, crisis_signal: false };
    if (positiveKeywords.some((k) => text.includes(k))) return { label: 'positive', score: 0.6, crisis_signal: false };
    return { label: 'neutral', score: 0, crisis_signal: false };
  }
}

export class ClaudeHttpAdapter implements IClaudeAdapter {
  private apiKey: string;
  private model: string;
  constructor() {
    const env = loadEnv();
    this.apiKey = env.ANTHROPIC_API_KEY ?? '';
    this.model = env.ANTHROPIC_MODEL;
  }
  async health(): Promise<Health> {
    if (!this.apiKey) return { ok: false, latency_ms: 0, detail: 'ANTHROPIC_API_KEY unset' };
    return { ok: true, latency_ms: 0 };
  }
  async summarizeRisk(args: {
    student_id: string;
    risk_score: number;
    timeline: Array<{ event_type: string; occurred_at: string; payload?: unknown }>;
  }): Promise<{ predicted_risk: number; top_factors: string[]; recommended_action: string }> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 800,
        system:
          'You are a student-services risk analyst. Reply with JSON only matching {predicted_risk, top_factors, recommended_action}.',
        messages: [
          {
            role: 'user',
            content: `student_id=${args.student_id} risk_score=${args.risk_score} timeline=${JSON.stringify(args.timeline)}`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`claude.summarizeRisk: ${res.status}`);
    const data = (await res.json()) as { content: Array<{ text: string }> };
    const text = data.content?.[0]?.text ?? '{}';
    return JSON.parse(text);
  }
  async draftNudge(args: {
    student_first_name: string;
    context: string;
    voice_sample?: string;
  }): Promise<{ draft: string }> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 400,
        system: `Draft a short, warm SMS nudge in the staff member's voice. Keep under 320 chars. Voice sample: ${args.voice_sample ?? 'professional but warm'}.`,
        messages: [
          {
            role: 'user',
            content: `Student: ${args.student_first_name}. Context: ${args.context}.`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`claude.draftNudge: ${res.status}`);
    const data = (await res.json()) as { content: Array<{ text: string }> };
    return { draft: data.content?.[0]?.text ?? '' };
  }
  async analyzeSentiment(args: { text: string }): Promise<{
    label: 'positive' | 'neutral' | 'negative' | 'distressed';
    score: number;
    crisis_signal: boolean;
    rationale?: string;
  }> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 200,
        system:
          'Analyze the sentiment of the student message. Return JSON only: {label: positive|neutral|negative|distressed, score: -1..1, crisis_signal: boolean, rationale: string}. crisis_signal=true ONLY if the writer references self-harm, suicide, or imminent harm.',
        messages: [{ role: 'user', content: args.text }],
      }),
    });
    if (!res.ok) throw new Error(`claude.analyzeSentiment: ${res.status}`);
    const data = (await res.json()) as { content: Array<{ text: string }> };
    return JSON.parse(data.content?.[0]?.text ?? '{}');
  }
}
