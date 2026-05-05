import { prisma } from '../../core/db/prisma.js';
import { emit, on, EVENT_TYPES } from '../../core/events/bus.js';
import { getIntegrations } from '../../integrations/factory.js';
import { logger } from '../../core/logger.js';

// Whenever a student sends a message, run sentiment analysis async,
// store the result on the message, and surface a wellness handoff if
// the model flags a crisis signal.
export function registerSentimentAnalysis(): void {
  on(EVENT_TYPES.MessageSent, async (event) => {
    const p = event.payload as { thread_id: string; message_id: string; sender_user_id: string };
    const message = await prisma.message.findUnique({
      where: { id: p.message_id },
      include: { sender: { select: { role: true } } },
    });
    if (!message || message.sender.role !== 'student') return;

    try {
      const result = await getIntegrations().claude.analyzeSentiment({ text: message.body });
      await prisma.message.update({
        where: { id: message.id },
        data: { sentiment_label: result.label, sentiment_score: result.score },
      });
      if (result.crisis_signal && event.student_id) {
        await emit({
          event_type: EVENT_TYPES.WellnessCrisisDetected,
          student_id: event.student_id,
          payload: {
            source: 'message',
            message_id: message.id,
            risk_tier: 'crisis',
            crisis_phrase_hit: true,
          },
        });
        logger.warn({ student_id: event.student_id, message_id: message.id }, 'sentiment.crisis_signal');
      } else if (result.label === 'distressed' && event.student_id) {
        await emit({
          event_type: EVENT_TYPES.TaskCreated,
          student_id: event.student_id,
          payload: {
            title: 'Sentiment-flagged message — review',
            description: 'Student message shows distress signals. Reach out within 24h.',
            priority: 'high',
            source_event_id: event.event_id,
          },
        });
      }
    } catch (err) {
      logger.warn({ err, message_id: message.id }, 'sentiment.analyze_failed');
    }
  });
}
