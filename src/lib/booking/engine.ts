import { db } from "@/db";
import { bookings, people, rooms, roleFunctionLinks, roomPermissions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getSettings } from "@/lib/settings";
import { combineDateAndTimeInAppTz, todayInAppTz, minutesBetween, nowInAppTz } from "@/lib/time";
import { createAuditLog } from "@/lib/audit";
import type { CreateBookingInput } from "@/lib/validation/schemas";

export class BookingError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Implements section 49 of the spec, in order. Every step can fail the whole
 * booking; nothing is created unless every step passes. This function is the
 * ONLY path that creates a booking — called from the server action and from
 * the API route, never duplicated.
 */
export async function createBooking(input: CreateBookingInput) {
  // 1 & 2. Validate person exists and is active.
  const person = await db.query.people.findFirst({
    where: eq(people.id, input.personId),
    with: { role: true, function: true },
  });
  if (!person) throw new BookingError("PERSON_NOT_FOUND", "Selected person not found.");
  if (!person.active) throw new BookingError("PERSON_INACTIVE", "This person is no longer active.");

  // 3. Validate role/function relationship.
  const link = await db.query.roleFunctionLinks.findFirst({
    where: and(
      eq(roleFunctionLinks.roleId, person.roleId),
      eq(roleFunctionLinks.functionId, person.functionId),
    ),
  });
  if (!link) {
    throw new BookingError(
      "ROLE_FUNCTION_MISMATCH",
      "This person's role and function combination is not permitted.",
    );
  }

  // 4. Validate room exists (and is active).
  const room = await db.query.rooms.findFirst({ where: eq(rooms.id, input.roomId) });
  if (!room || !room.active) throw new BookingError("ROOM_NOT_FOUND", "Selected room not found.");

  // 5. Validate room permission for this person's role.
  const permission = await db.query.roomPermissions.findFirst({
    where: and(eq(roomPermissions.roomId, room.id), eq(roomPermissions.roleId, person.roleId)),
  });
  if (!permission) {
    throw new BookingError(
      "ROOM_FORBIDDEN",
      "This role is not permitted to book this room.",
    );
  }

  // 6. If EB Room (or any password-protected room), validate password server-side.
  const settings = await getSettings();
  if (room.requiresPassword) {
    if (!input.ebRoomPassword) {
      throw new BookingError("PASSWORD_REQUIRED", "A password is required for this room.");
    }
    const ok = await bcrypt.compare(input.ebRoomPassword, settings.ebRoomPasswordHash);
    if (!ok) {
      // Deliberately generic — never reveal whether the password was close.
      throw new BookingError("INCORRECT_PASSWORD", "Incorrect password.");
    }
  }

  // 7 & 8. Validate booking date is inside the configured booking period, and not in the past.
  const today = todayInAppTz();
  if (input.date < today) {
    throw new BookingError("DATE_IN_PAST", "You cannot book a date in the past.");
  }
  if (input.date < settings.bookingStartDate || input.date > settings.bookingEndDate) {
    throw new BookingError(
      "OUTSIDE_BOOKING_PERIOD",
      `Bookings are only open between ${settings.bookingStartDate} and ${settings.bookingEndDate}.`,
    );
  }

  // 9. Validate start/end times.
  const startAt = combineDateAndTimeInAppTz(input.date, input.startTime);
  const endAt = combineDateAndTimeInAppTz(input.date, input.endTime);
  if (endAt <= startAt) {
    throw new BookingError("INVALID_TIME_RANGE", "End time must be after start time.");
  }
  if (input.date === today && startAt < nowInAppTz()) {
    throw new BookingError("START_TIME_IN_PAST", "You cannot book a start time in the past.");
  }

  // 10. Validate duration against configured min/max.
  const durationMinutes = minutesBetween(startAt, endAt);
  if (durationMinutes < settings.minBookingMinutes) {
    throw new BookingError(
      "TOO_SHORT",
      `Bookings must be at least ${settings.minBookingMinutes} minutes.`,
    );
  }
  if (durationMinutes > settings.maxBookingMinutes) {
    throw new BookingError(
      "TOO_LONG",
      `Bookings cannot exceed ${settings.maxBookingMinutes} minutes.`,
    );
  }

  // 11 & 12. Check room conflicts and create atomically. The real guarantee
  // against race conditions is the Postgres EXCLUDE constraint
  // (bookings_no_overlap, see drizzle/0001_booking_overlap_guard.sql) — this
  // pre-check just gives a fast, friendly error in the common case; the
  // constraint is the backstop that can never be bypassed.
  const qrToken = randomUUID();

  // Booking codes are human-friendly display IDs only; the UUID `id` is the
  // real primary key used everywhere internally. A rare code collision (two
  // simultaneous bookings computing the same sequence number) is retried
  // rather than failing the booking.
  for (let attempt = 0; attempt < 3; attempt++) {
    const bookingCode = await generateBookingCode(input.date);
    try {
      const [created] = await db
        .insert(bookings)
        .values({
          bookingCode,
          personId: person.id,
          roomId: room.id,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          status: "UPCOMING",
          qrToken,
        })
        .returning();

      // 13. QR token generated above (created.qrToken) — contains only an
      // opaque UUID, never personal data.
      // 14. Create audit log.
      await createAuditLog({
        actorId: person.id,
        actorLabel: person.name,
        action: "BOOKING_CREATED",
        entityType: "booking",
        entityId: created.id,
        newData: created,
      });

      // 15. Return booking confirmation.
      return created;
    } catch (err: unknown) {
      if (isExclusionViolation(err)) {
        throw new BookingError(
          "ROOM_CONFLICT",
          "Sorry, this room was just booked by someone else. Please choose another time.",
        );
      }
      if (isUniqueViolation(err) && attempt < 2) {
        continue; // booking_code collided — retry with a freshly computed code
      }
      throw err;
    }
  }
  throw new BookingError("UNEXPECTED", "Could not create booking. Please try again.");
}

function isExclusionViolation(err: unknown): boolean {
  // Postgres error code 23P01 = exclusion_violation
  return getPgErrorCode(err) === "23P01";
}

function isUniqueViolation(err: unknown): boolean {
  // Postgres error code 23505 = unique_violation
  return getPgErrorCode(err) === "23505";
}

function getPgErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  // drizzle-orm wraps the underlying postgres.js error in a DrizzleQueryError;
  // the actual Postgres error code lives on `.cause`, not on the wrapper itself.
  const direct = (err as { code?: string }).code;
  if (direct) return direct;
  const cause = (err as { cause?: { code?: string } }).cause;
  return cause?.code;
}

async function generateBookingCode(dateStr: string): Promise<string> {
  const year = dateStr.slice(0, 4);
  // A real Postgres sequence — atomic under concurrency, unlike a
  // count()-based or randomized guess, which can collide when many
  // requests race for the same room/time.
  const [{ nextval }] = await db.execute<{ nextval: string }>(
    sql`SELECT nextval('booking_code_seq') as nextval`,
  );
  const seq = String(nextval).padStart(4, "0");
  return `BK-${year}-${seq}`;
}
