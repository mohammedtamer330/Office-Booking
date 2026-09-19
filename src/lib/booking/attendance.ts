import { db } from "@/db";
import { bookings, bookingAttendees, checkIns, people } from "@/db/schema";
import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { combineDateAndTimeInAppTz, nowInAppTz } from "@/lib/time";
import { createAuditLog } from "@/lib/audit";
import { BookingError } from "./engine";
import { evaluateCheckInWindow } from "./lifecycle";
import type { AttendeeRow } from "@/lib/schedule-types";

/**
 * Team check-in. One person books; whoever turns up checks in with their own
 * name. This file is the ONLY place attendance rows are written — the
 * homepage cards, timeline, booking modal, My bookings and the QR page all
 * reach it through the same server action.
 */

export const MAX_ATTENDEES_PER_BOOKING = 60;
const NAME_MIN = 2;
const NAME_MAX = 80;
// Letters (any script — names here are often Arabic), combining marks, digits,
// spaces and the punctuation real names use. Must start with a letter.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\p{N} .'’-]*$/u;

/** Trims, collapses spacing and builds the case-insensitive key used to detect duplicates. */
export function normalizeAttendeeName(raw: unknown): { display: string; key: string } {
  if (typeof raw !== "string") throw new BookingError("EMPTY_NAME", "Enter your full name.");
  const display = raw.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (display.length === 0) throw new BookingError("EMPTY_NAME", "Enter your full name.");
  if (display.length < NAME_MIN) throw new BookingError("NAME_TOO_SHORT", "Enter your full name.");
  if (display.length > NAME_MAX) {
    throw new BookingError("NAME_TOO_LONG", `Names can be at most ${NAME_MAX} characters.`);
  }
  if (!NAME_PATTERN.test(display)) {
    throw new BookingError("INVALID_NAME", "Names can only contain letters, spaces and . ' -");
  }
  return { display, key: display.toLowerCase() };
}

export type CheckInAttendeeResult = {
  attendee: AttendeeRow;
  late: boolean;
  /** True when this person was the first to arrive (they also started the booking-level check-in). */
  firstArrival: boolean;
  attendeeCount: number;
};

export async function checkInAttendee(input: {
  bookingId: string;
  name: string;
  method?: "QR" | "BOOKING_PAGE" | "ADMIN_MANUAL";
}): Promise<CheckInAttendeeResult> {
  const method = input.method ?? "BOOKING_PAGE";
  const { display, key } = normalizeAttendeeName(input.name);

  const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, input.bookingId) });
  if (!booking) throw new BookingError("BOOKING_NOT_FOUND", "We couldn't find that booking.");
  if (booking.status === "CANCELLED") throw new BookingError("CANCELLED", "This booking was cancelled.");
  if (booking.status === "NO_SHOW") {
    throw new BookingError("NO_SHOW", "This booking was marked as a no-show, so check-in is closed.");
  }
  if (booking.status === "COMPLETED") {
    throw new BookingError("ALREADY_COMPLETED", "This booking is already complete.");
  }

  const settings = await getSettings();
  const now = nowInAppTz();

  // Nobody can check in to a booking that has already finished.
  const endAt = combineDateAndTimeInAppTz(booking.date, booking.endTime);
  if (now > endAt) throw new BookingError("BOOKING_ENDED", "This booking has already ended.");

  // Same too-early / late rules as the booking-level check-in, applied per person.
  const { late } = evaluateCheckInWindow(booking, settings, now);

  // If the typed name is exactly a known active person, link them — it makes
  // analytics accurate. Free text is otherwise stored as typed.
  const [known] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.active, true), sql`lower(regexp_replace(btrim(${people.name}), '\s+', ' ', 'g')) = ${key}`))
    .limit(1);

  const result = await db.transaction(async (tx) => {
    const [{ n }] = await tx
      .select({ n: count() })
      .from(bookingAttendees)
      .where(eq(bookingAttendees.bookingId, booking.id));
    if (n >= MAX_ATTENDEES_PER_BOOKING) {
      throw new BookingError("TOO_MANY_ATTENDEES", "This booking has reached its check-in limit.");
    }

    // The unique (booking_id, name_key) index is the real guard against
    // duplicates — this stays correct even if two taps land at the same instant.
    const inserted = await tx
      .insert(bookingAttendees)
      .values({
        bookingId: booking.id,
        attendeeName: display,
        nameKey: key,
        personId: known?.id ?? null,
        status: late ? "LATE" : "ON_TIME",
        method,
        checkedInAt: now,
      })
      .onConflictDoNothing({ target: [bookingAttendees.bookingId, bookingAttendees.nameKey] })
      .returning();

    if (inserted.length === 0) {
      throw new BookingError("ALREADY_CHECKED_IN", `${display} is already checked in for this booking.`);
    }

    // First arrival also starts the booking-level check-in, exactly as before
    // (status, actualCheckInAt, lateCheckIn) — so no-show detection and the
    // existing analytics are unaffected. The WHERE makes it safe if two
    // first arrivals race: only one update wins.
    let firstArrival = false;
    if (!booking.actualCheckInAt) {
      const started = await tx
        .update(bookings)
        .set({ status: "CHECKED_IN", actualCheckInAt: now, lateCheckIn: late, updatedAt: now })
        .where(and(eq(bookings.id, booking.id), isNull(bookings.actualCheckInAt), eq(bookings.status, "UPCOMING")))
        .returning({ id: bookings.id });
      if (started.length > 0) {
        firstArrival = true;
        await tx.insert(checkIns).values({
          bookingId: booking.id,
          method,
          actorId: known?.id ?? display,
          timestamp: now,
        });
      }
    }

    return { row: inserted[0], firstArrival, attendeeCount: n + 1 };
  });

  await createAuditLog({
    actorId: known?.id ?? "attendee",
    actorLabel: display,
    action: "CHECK_IN",
    entityType: "booking",
    entityId: booking.id,
    newData: { attendee: display, method, late, firstArrival: result.firstArrival, timestamp: now },
  });

  return {
    attendee: toAttendeeRow(result.row),
    late,
    firstArrival: result.firstArrival,
    attendeeCount: result.attendeeCount,
  };
}

function toAttendeeRow(r: typeof bookingAttendees.$inferSelect): AttendeeRow {
  return {
    id: r.id,
    name: r.attendeeName,
    checkedInAt: r.checkedInAt.toISOString(),
    status: r.status,
    method: r.method,
  };
}

/** Attendees for a set of bookings, earliest arrival first. One query, however many bookings. */
export async function getAttendeesByBooking(bookingIds: string[]): Promise<Map<string, AttendeeRow[]>> {
  const map = new Map<string, AttendeeRow[]>();
  if (bookingIds.length === 0) return map;
  const rows = await db
    .select()
    .from(bookingAttendees)
    .where(inArray(bookingAttendees.bookingId, bookingIds))
    .orderBy(asc(bookingAttendees.checkedInAt));
  for (const r of rows) {
    const list = map.get(r.bookingId) ?? [];
    list.push(toAttendeeRow(r));
    map.set(r.bookingId, list);
  }
  return map;
}

/** Just the counts — for lists that only need "3 checked in". */
export async function getAttendeeCounts(bookingIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (bookingIds.length === 0) return map;
  const rows = await db
    .select({ bookingId: bookingAttendees.bookingId, n: count() })
    .from(bookingAttendees)
    .where(inArray(bookingAttendees.bookingId, bookingIds))
    .groupBy(bookingAttendees.bookingId);
  for (const r of rows) map.set(r.bookingId, r.n);
  return map;
}

/** Admin-only (the calling action enforces the session): remove a mistaken or spam attendee. */
export async function removeAttendee(attendeeId: string, actorLabel: string) {
  const [row] = await db.select().from(bookingAttendees).where(eq(bookingAttendees.id, attendeeId)).limit(1);
  if (!row) throw new BookingError("ATTENDEE_NOT_FOUND", "That attendee no longer exists.");
  await db.delete(bookingAttendees).where(eq(bookingAttendees.id, attendeeId));
  // BOOKING_EDITED is an existing audit action; reusing it avoids altering the audit enum.
  await createAuditLog({
    actorId: "admin",
    actorLabel,
    action: "BOOKING_EDITED",
    entityType: "booking",
    entityId: row.bookingId,
    oldData: { attendee: row.attendeeName, checkedInAt: row.checkedInAt },
    newData: { attendeeRemoved: row.attendeeName },
  });
  return row.bookingId;
}
