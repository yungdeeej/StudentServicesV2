import { prisma } from '../../core/db/prisma.js';
import type { AppointmentKind } from '@prisma/client';

export type Slot = { start: string; end: string };

/**
 * Compute available slots for a staff member between `from` and `to`,
 * inclusive of recurring weekly availability minus existing appointments.
 *
 * `from`/`to` are JS Date instances; comparisons use the server's timezone
 * (assumed America/Edmonton per ASSUMPTIONS.A-001).
 */
export async function computeAvailableSlots(args: {
  staff_user_id: string;
  kind: AppointmentKind;
  from: Date;
  to: Date;
}): Promise<Slot[]> {
  const availability = await prisma.staffAvailability.findMany({
    where: {
      user_id: args.staff_user_id,
      active: true,
      appointment_kinds: { has: args.kind },
    },
  });
  if (availability.length === 0) return [];

  const existing = await prisma.appointment.findMany({
    where: {
      staff_user_id: args.staff_user_id,
      scheduled_at: { gte: args.from, lt: args.to },
      status: { notIn: ['cancelled', 'no_show'] },
    },
  });
  const taken = new Set(
    existing.map((a) => `${a.scheduled_at.toISOString()}|${a.duration_minutes}`),
  );

  const slots: Slot[] = [];
  for (let day = new Date(args.from); day < args.to; day.setDate(day.getDate() + 1)) {
    const dow = day.getDay();
    for (const a of availability.filter((a) => a.day_of_week === dow)) {
      for (let m = a.start_minute; m + a.slot_minutes <= a.end_minute; m += a.slot_minutes) {
        const start = new Date(day);
        start.setHours(0, 0, 0, 0);
        start.setMinutes(m);
        const end = new Date(start.getTime() + a.slot_minutes * 60 * 1000);
        const key = `${start.toISOString()}|${a.slot_minutes}`;
        if (taken.has(key)) continue;
        if (start < new Date()) continue;
        if (start >= args.to) continue;
        slots.push({ start: start.toISOString(), end: end.toISOString() });
      }
    }
  }
  return slots;
}
