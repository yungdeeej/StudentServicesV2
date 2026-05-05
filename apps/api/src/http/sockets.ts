import type { Server as SocketIoServer } from 'socket.io';
import { on, EVENT_TYPES } from '../core/events/bus.js';
import { logger } from '../core/logger.js';

const BROADCAST_EVENTS = [
  EVENT_TYPES.RiskFlagged,
  EVENT_TYPES.RiskCleared,
  EVENT_TYPES.RiskEscalated,
  EVENT_TYPES.CaseOpened,
  EVENT_TYPES.CaseClosed,
  EVENT_TYPES.TaskCreated,
  EVENT_TYPES.NewsletterOpened,
  EVENT_TYPES.OrientationAttended,
  EVENT_TYPES.StudentCreated,
];

export function registerSocketBroadcasts(io: SocketIoServer): void {
  io.on('connection', (socket) => {
    logger.debug({ id: socket.id }, 'socket.connected');
    socket.on('disconnect', () => logger.debug({ id: socket.id }, 'socket.disconnected'));
  });
  for (const t of BROADCAST_EVENTS) {
    on(t, (event) => {
      io.emit(`event:${t}`, event);
    });
  }
}
