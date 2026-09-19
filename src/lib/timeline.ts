import type { BookingSummary } from "@/lib/schedule-types";

export const TL_START_MIN = 8 * 60;
export const TL_END_MIN = 22 * 60;
const STEP = 30;

export type Segment =
  | { kind: "booked"; start: number; end: number; booking: BookingSummary }
  | { kind: "free"; start: number; end: number; bookable: boolean };

export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const minToTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * Turns one room's bookings for one day into an ordered list of booked and
 * free stretches between 08:00 and 22:00.
 *
 *  - Past days show only what happened (no free stretches).
 *  - Today drops the part of each free stretch that's already gone by.
 *  - A free stretch shorter than the minimum booking length is kept but
 *    flagged not bookable, so nobody is offered a slot the server would refuse.
 */
export function buildSegments(
  roomBookings: BookingSummary[],
  opts: { isPast: boolean; isToday: boolean; nowMin: number; minBookingMinutes: number; dayBookable: boolean },
): Segment[] {
  const sorted = [...roomBookings].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const out: Segment[] = [];
  let cursor = TL_START_MIN;

  const pushFree = (from: number, to: number) => {
    if (opts.isPast) return;
    let start = from;
    if (opts.isToday) start = Math.max(start, Math.ceil(opts.nowMin / STEP) * STEP);
    if (to - start <= 0) return;
    out.push({ kind: "free", start, end: to, bookable: opts.dayBookable && to - start >= opts.minBookingMinutes });
  };

  for (const b of sorted) {
    const s = Math.max(TL_START_MIN, toMin(b.startTime));
    const e = Math.min(TL_END_MIN, toMin(b.endTime));
    if (e <= s) continue;
    if (s > cursor) pushFree(cursor, s);
    out.push({ kind: "booked", start: s, end: e, booking: b });
    cursor = Math.max(cursor, e);
  }
  if (cursor < TL_END_MIN) pushFree(cursor, TL_END_MIN);
  return out;
}

/** Live state of a room right now, from today's bookings. */
export function roomLiveState(roomBookings: BookingSummary[], nowMs: number) {
  const current = roomBookings.find((b) => b.startsAtMs <= nowMs && nowMs < b.endsAtMs) ?? null;
  const next = roomBookings.find((b) => b.startsAtMs > nowMs) ?? null;
  return { current, next };
}
