import { prisma } from '../../core/db/prisma.js';
import {
  computeEngagementScore,
  tierForScore,
  type EngagementWeights,
} from '@mcg/rules-engine';
import { on, EVENT_TYPES } from '../../core/events/bus.js';

const RECOMPUTE_TRIGGERS = [
  EVENT_TYPES.NewsletterOpened,
  EVENT_TYPES.NewsletterSent,
  EVENT_TYPES.EngagementEventAttended,
  EVENT_TYPES.ConnectRoomAssigned,
  EVENT_TYPES.StudentLeaderAssigned,
  EVENT_TYPES.MoodleActivityRecorded,
];

export function registerEngagementScoreRecompute(): void {
  for (const t of RECOMPUTE_TRIGGERS) {
    on(t, async (event) => {
      if (!event.student_id) return;
      await recomputeEngagement(event.student_id);
    });
  }
}

export async function recomputeEngagement(student_id: string): Promise<void> {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [eventsAttended, eventsTotal, deliveries, opens, leaders, outreachInbound, outreachOutbound] =
    await Promise.all([
      prisma.eventParticipation.count({
        where: { student_id, attended_at: { gte: since30 } },
      }),
      prisma.eventParticipation.count({ where: { attended_at: { gte: since30 } } }),
      prisma.newsletterDelivery.count({
        where: { student_id, sent_at: { gte: since30 } },
      }),
      prisma.newsletterDelivery.count({
        where: { student_id, opened_at: { not: null, gte: since30 } },
      }),
      prisma.studentLeaderAssignment.count({ where: { student_id } }),
      prisma.communication.count({
        where: { student_id, direction: 'inbound', occurred_at: { gte: since30 } },
      }),
      prisma.communication.count({
        where: { student_id, direction: 'outbound', occurred_at: { gte: since30 } },
      }),
    ]);

  const cfg =
    (await prisma.engagementScoreConfig.findFirst({ where: { active: true }, orderBy: { effective_at: 'desc' } })) ??
    null;
  const weights: EngagementWeights = {
    event_attendance: cfg?.weight_event_attendance ?? 0.3,
    newsletter_open: cfg?.weight_newsletter_open ?? 0.25,
    connect_room: cfg?.weight_connect_room ?? 0.25,
    outreach: cfg?.weight_outreach_response ?? 0.2,
  };

  const event_attendance_pct =
    eventsTotal === 0 ? 0 : Math.min(100, Math.round((eventsAttended / Math.max(1, eventsTotal)) * 100));
  const newsletter_open_rate = deliveries === 0 ? 0 : Math.round((opens / deliveries) * 100);
  const connect_room_activity_score = Math.min(100, leaders * 25);
  const outreach_response_rate =
    outreachOutbound === 0 ? 0 : Math.min(100, Math.round((outreachInbound / outreachOutbound) * 100));

  const score = Math.round(
    computeEngagementScore(
      {
        event_attendance_pct,
        newsletter_open_rate,
        connect_room_activity_score,
        outreach_response_rate,
      },
      weights,
    ),
  );
  const tier = tierForScore(score, {
    high: cfg?.threshold_high ?? 70,
    medium: cfg?.threshold_medium ?? 40,
  });
  await prisma.studentFlags.upsert({
    where: { student_id },
    update: { engagement_score: score, engagement_tier: tier, last_recomputed_at: new Date() },
    create: { student_id, engagement_score: score, engagement_tier: tier },
  });
}
