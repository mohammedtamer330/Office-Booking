import { db } from "@/db";
import { bookings, checkIns, checkOuts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { combineDateAndTimeInAppTz, nowInAppTz, minutesBetween } from "@/lib/time";
import { createAuditLog } from "@/lib/audit";
import { BookingError } from "./engine";

type CheckMethod = "QR" | "BOOKING_PAGE" | "ADMIN_MANUAL";

/** Computes a booking's *effective* status, promoting UPCOMING → NO_SHOW once
 * the grace period has elapsed with no check-in. Called wherever a booking's
 * status is displayed or evaluated, so no-show state is always accurate even
 * without a cron job — the cron endpoint (api/cron/no-show) additionally
 * persists this so audit logs and analytics stay correct without a page view
 * triggering it.
 */
export async function effectiveStatus(booking: typeof bookings.$inferSelect, graceMinutes: number) {
  if (booking.status !== "UPCOMING") return booking.status;
  const startAt = combineDateAndTimeInAppTz(booking.date, booking.startTime);
  const graceEnd = new Date(startAt.getTime() + graceMinutes * 60000);
  if (nowInAppTz() > graceEnd) return "NO_SHOW" as const;
  return booking.status;
}

type CheckInWindowInput = Pick<typeof bookings.$inferSelect, "date" | "startTime">;

/**
 * The single definition of "is check-in allowed right now, and is it late?".
 * Used by the booking-level check-in below AND by every attendee check-in
 * (lib/booking/attendance.ts) so the two can never disagree.
 */
export function evaluateCheckInWindow(
  booking: CheckInWindowInput,
  settings: Awaited<ReturnType<typeof getSettings>>,
  now: Date,
): { late: boolean } {
  const startAt = combineDateAndTimeInAppTz(booking.date, booking.startTime);
  const windowStart = new Date(startAt.getTime() - settings.checkInWindowBeforeMinutes * 60000);
  const windowEnd = new Date(startAt.getTime() + settings.checkInWindowAfterMinutes * 60000);

  if (now < windowStart) {
    throw new BookingError(
      "TOO_EARLY",
      `Check-in opens ${settings.checkInWindowBeforeMinutes} minutes before your start time.`,
    );
  }

  const late = now > windowEnd;
  if (late && settings.lateCheckInPolicy === "BLOCK") {
    throw new BookingError("CHECK_IN_WINDOW_CLOSED", "The check-in window for this booking has closed.");
  }
  // ALLOW / ALLOW_WITH_WARNING both proceed; the warning is surfaced by the caller.
  return { late };
}

/**
 * Booking-level check-in. The public check-in flow now goes through
 * checkInAttendee (which also sets this booking-level state on the first
 * arrival); this remains for the admin's manual override.
 */
export async function checkIn(bookingId: string, method: CheckMethod, actorId: string) {
  const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, bookingId) });
  if (!booking) throw new BookingError("BOOKING_NOT_FOUND", "Booking not found.");
  if (booking.status === "CANCELLED") throw new BookingError("CANCELLED", "This booking was cancelled.");
  if (booking.status === "COMPLETED") throw new BookingError("ALREADY_COMPLETED", "This booking is already completed.");
  if (booking.actualCheckInAt) throw new BookingError("ALREADY_CHECKED_IN", "Already checked in.");

  const settings = await getSettings();
  const now = nowInAppTz();
  const { late: isLate } = evaluateCheckInWindow(booking, settings, now);

  const [updated] = await db
    .update(bookings)
    .set({ status: "CHECKED_IN", actualCheckInAt: now, lateCheckIn: isLate, updatedAt: now })
    .where(eq(bookings.id, bookingId))
    .returning();

  await db.insert(checkIns).values({ bookingId, method, actorId, timestamp: now });
  await createAuditLog({
    actorId,
    actorLabel: actorId,
    action: "CHECK_IN",
    entityType: "booking",
    entityId: bookingId,
    newData: { method, timestamp: now, late: isLate },
  });

  return { booking: updated, late: isLate };
}

export async function checkOut(bookingId: string, method: CheckMethod, actorId: string) {
  const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, bookingId) });
  if (!booking) throw new BookingError("BOOKING_NOT_FOUND", "Booking not found.");
  if (!booking.actualCheckInAt) throw new BookingError("NOT_CHECKED_IN", "This booking hasn't been checked in yet.");
  if (booking.actualCheckOutAt) throw new BookingError("ALREADY_CHECKED_OUT", "Already checked out.");

  const now = nowInAppTz();
  const [updated] = await db
    .update(bookings)
    .set({ status: "COMPLETED", actualCheckOutAt: now, updatedAt: now })
    .where(eq(bookings.id, bookingId))
    .returning();

  await db.insert(checkOuts).values({ bookingId, method, actorId, timestamp: now });

  const durationMinutes = minutesBetween(booking.actualCheckInAt, now);
  await createAuditLog({
    actorId,
    actorLabel: actorId,
    action: "CHECK_OUT",
    entityType: "booking",
    entityId: bookingId,
    newData: { method, timestamp: now, durationMinutes },
  });

  return updated;
}

export async function cancelBooking(bookingId: string, cancelledBy: "user" | "admin", actorId: string) {
  const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, bookingId) });
  if (!booking) throw new BookingError("BOOKING_NOT_FOUND", "Booking not found.");
  if (booking.status === "CANCELLED") throw new BookingError("ALREADY_CANCELLED", "Already cancelled.");
  if (booking.status === "COMPLETED") throw new BookingError("ALREADY_COMPLETED", "Cannot cancel a completed booking.");

  if (cancelledBy === "user") {
    // Only the person who made the booking can cancel it as a "user";
    // admins cancel with cancelledBy = "admin" (which the action layer gates on the admin session).
    if (booking.personId !== actorId) {
      throw new BookingError("NOT_BOOKING_OWNER", "Only the person who made this booking can cancel it.");
    }
    const settings = await getSettings();
    const startAt = combineDateAndTimeInAppTz(booking.date, booking.startTime);
    const now = nowInAppTz();
    const minutesUntilStart = minutesBetween(now, startAt);
    if (minutesUntilStart < settings.cancellationCutoffMinutes) {
      throw new BookingError(
        "CANCELLATION_TOO_LATE",
        `Bookings can only be cancelled at least ${settings.cancellationCutoffMinutes} minutes before the start time.`,
      );
    }
  }

  const now = nowInAppTz();
  const [updated] = await db
    .update(bookings)
    .set({ status: "CANCELLED", cancelledAt: now, cancelledBy, updatedAt: now })
    .where(eq(bookings.id, bookingId))
    .returning();

  await createAuditLog({
    actorId,
    actorLabel: actorId,
    action: "BOOKING_CANCELLED",
    entityType: "booking",
    entityId: bookingId,
    oldData: { status: booking.status },
    newData: { status: "CANCELLED", cancelledBy },
  });

  return updated;
}

/** Sweeps UPCOMING bookings past their no-show grace period and marks them
 * NO_SHOW, persisting what `effectiveStatus` already computes on the fly.
 * Intended to run on a schedule (see vercel.json cron + api/cron/no-show).
 */
export async function sweepNoShows() {
  const settings = await getSettings();
  const upcoming = await db.query.bookings.findMany({ where: eq(bookings.status, "UPCOMING") });
  const now = nowInAppTz();
  let marked = 0;

  for (const booking of upcoming) {
    const startAt = combineDateAndTimeInAppTz(booking.date, booking.startTime);
    const graceEnd = new Date(startAt.getTime() + settings.noShowGraceMinutes * 60000);
    if (now > graceEnd) {
      await db
        .update(bookings)
        .set({ status: "NO_SHOW", updatedAt: now })
        .where(eq(bookings.id, booking.id));
      await createAuditLog({
        actorId: "system",
        actorLabel: "System (no-show sweep)",
        action: "NO_SHOW",
        entityType: "booking",
        entityId: booking.id,
      });
      marked++;
    }
  }
  return marked;
}
