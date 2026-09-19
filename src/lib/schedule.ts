import { db } from "@/db";
import { bookings, functions, people, rooms } from "@/db/schema";
import { and, asc, desc, eq, gt, gte, lte, notInArray } from "drizzle-orm";
import { getSettings, type AppSettings } from "@/lib/settings";
import { combineDateAndTimeInAppTz, formatInAppTz, todayInAppTz } from "@/lib/time";
import { getAttendeeCounts, getAttendeesByBooking } from "@/lib/booking/attendance";
import type {
  BookingDetails,
  BookingStatus,
  BookingSummary,
  DaySchedule,
  MonthDay,
  RoomInfo,
} from "@/lib/schedule-types";

/** Same hours the time picker offers (see components/booking/time-slot-picker.tsx). */
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 22;

// A booking in one of these states no longer holds its slot (the DB overlap
// constraint ignores them too), so they don't appear as "booked".
const FREE_STATUSES: BookingStatus[] = ["CANCELLED", "NO_SHOW"];

type BookingRowWithRefs = typeof bookings.$inferSelect & {
  room: typeof rooms.$inferSelect;
  person: typeof people.$inferSelect & {
    role: { label: string };
    function: typeof functions.$inferSelect;
  };
};

function toSummary(b: BookingRowWithRefs, attendeeCount: number, settings: AppSettings): BookingSummary {
  const startsAt = combineDateAndTimeInAppTz(b.date, b.startTime);
  const endsAt = combineDateAndTimeInAppTz(b.date, b.endTime);
  const opensAt = new Date(startsAt.getTime() - settings.checkInWindowBeforeMinutes * 60000);
  const lateAfter = new Date(startsAt.getTime() + settings.checkInWindowAfterMinutes * 60000);
  return {
    id: b.id,
    roomId: b.roomId,
    roomName: b.room.name,
    roomSlug: b.room.slug,
    date: b.date,
    startTime: b.startTime.slice(0, 5),
    endTime: b.endTime.slice(0, 5),
    status: b.status,
    ownerId: b.person.id,
    ownerName: b.person.name,
    ownerPosition: b.person.position,
    functionId: b.person.function.id,
    functionLabel: b.person.function.label,
    functionColor: b.person.function.color,
    roleLabel: b.person.role.label,
    attendeeCount,
    startsAtMs: startsAt.getTime(),
    endsAtMs: endsAt.getTime(),
    opensAtMs: opensAt.getTime(),
    lateAfterMs: lateAfter.getTime(),
    opensAtLabel: formatInAppTz(opensAt, "HH:mm"),
    blockLate: settings.lateCheckInPolicy === "BLOCK",
  };
}

const bookingRefs = { room: true, person: { with: { role: true, function: true } } } as const;

async function activeRooms(): Promise<RoomInfo[]> {
  const rows = await db.select().from(rooms).where(eq(rooms.active, true));
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      requiresPassword: r.requiresPassword,
    }))
    .sort((a, b) => Number(b.requiresPassword) - Number(a.requiresPassword) || a.name.localeCompare(b.name));
}

/** Every room plus every booking that holds a slot on `date`, with attendance counts. Two queries. */
export async function getDaySchedule(date: string): Promise<DaySchedule> {
  const [roomList, settings, rows] = await Promise.all([
    activeRooms(),
    getSettings(),
    db.query.bookings.findMany({
      where: and(eq(bookings.date, date), notInArray(bookings.status, FREE_STATUSES)),
      with: bookingRefs,
      orderBy: [asc(bookings.startTime)],
    }),
  ]);
  const counts = await getAttendeeCounts(rows.map((r) => r.id));
  return {
    date,
    rooms: roomList,
    bookings: rows.map((r) => toSummary(r as BookingRowWithRefs, counts.get(r.id) ?? 0, settings)),
  };
}

/** Per-day booking activity for one calendar month — only that month is read. */
export async function getMonthDays(month: string): Promise<MonthDay[]> {
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const last = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;

  const [roomList, rows] = await Promise.all([
    activeRooms(),
    db
      .select({
        date: bookings.date,
        start: bookings.startTime,
        end: bookings.endTime,
        color: functions.color,
      })
      .from(bookings)
      .innerJoin(people, eq(bookings.personId, people.id))
      .innerJoin(functions, eq(people.functionId, functions.id))
      .where(and(gte(bookings.date, first), lte(bookings.date, last), notInArray(bookings.status, FREE_STATUSES))),
  ]);

  const capacityMinutes = Math.max(1, roomList.length) * (DAY_END_HOUR - DAY_START_HOUR) * 60;
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const byDay = new Map<string, MonthDay & { minutes: number }>();

  for (const r of rows) {
    const d = byDay.get(r.date) ?? { date: r.date, count: 0, colors: [], load: 0, minutes: 0 };
    d.count += 1;
    d.minutes += Math.max(0, toMin(r.end) - toMin(r.start));
    const color = r.color ?? "#5B6470";
    if (!d.colors.includes(color) && d.colors.length < 3) d.colors.push(color);
    byDay.set(r.date, d);
  }

  return Array.from(byDay.values()).map(({ minutes, ...d }) => ({
    ...d,
    load: Math.min(1, minutes / capacityMinutes),
  }));
}

/** The next few bookings after today (today's own bookings live in the Today section). */
export async function getUpcomingBookings(limit = 6): Promise<BookingSummary[]> {
  const today = todayInAppTz();
  const [settings, rows] = await Promise.all([
    getSettings(),
    db.query.bookings.findMany({
      where: and(gt(bookings.date, today), eq(bookings.status, "UPCOMING")),
      with: bookingRefs,
      orderBy: [asc(bookings.date), asc(bookings.startTime)],
      limit,
    }),
  ]);
  const counts = await getAttendeeCounts(rows.map((r) => r.id));
  return rows.map((r) => toSummary(r as BookingRowWithRefs, counts.get(r.id) ?? 0, settings));
}

/** Everything the booking-details modal needs. Deliberately excludes the QR token and booking code. */
export async function getBookingDetails(bookingId: string): Promise<BookingDetails | null> {
  const row = await db.query.bookings.findFirst({ where: eq(bookings.id, bookingId), with: bookingRefs });
  if (!row) return null;

  const [settings, attendeeMap, members] = await Promise.all([
    getSettings(),
    getAttendeesByBooking([row.id]),
    db
      .select({ name: people.name })
      .from(people)
      .where(and(eq(people.active, true), eq(people.functionId, row.person.functionId)))
      .orderBy(asc(people.name)),
  ]);

  const attendees = attendeeMap.get(row.id) ?? [];
  return {
    summary: toSummary(row as BookingRowWithRefs, attendees.length, settings),
    attendees,
    suggestions: members.map((m) => m.name),
  };
}

/** A booking by its QR token — the landing page for the QR code on the confirmation screen. */
export async function getBookingByQrToken(
  token: string,
): Promise<{ summary: BookingSummary; bookingCode: string; actualCheckOutAt: Date | null } | null> {
  const row = await db.query.bookings.findFirst({ where: eq(bookings.qrToken, token), with: bookingRefs });
  if (!row) return null;
  const [settings, counts] = await Promise.all([getSettings(), getAttendeeCounts([row.id])]);
  return {
    summary: toSummary(row as BookingRowWithRefs, counts.get(row.id) ?? 0, settings),
    bookingCode: row.bookingCode,
    actualCheckOutAt: row.actualCheckOutAt,
  };
}

export type MyBooking = {
  summary: BookingSummary;
  bookingCode: string;
  qrToken: string;
  attendees: BookingDetails["attendees"];
};

/**
 * One person's own bookings (newest first) with who checked in to each.
 * The booking code and QR link are included because this feeds the person's
 * own "My bookings" page, which already showed them.
 */
export async function getPersonBookings(personId: string): Promise<MyBooking[]> {
  const [settings, rows] = await Promise.all([
    getSettings(),
    db.query.bookings.findMany({
      where: eq(bookings.personId, personId),
      with: bookingRefs,
      orderBy: [desc(bookings.date), desc(bookings.startTime)],
    }),
  ]);
  const attendeeMap = await getAttendeesByBooking(rows.map((r) => r.id));
  return rows.map((r) => {
    const attendees = attendeeMap.get(r.id) ?? [];
    return {
      summary: toSummary(r as BookingRowWithRefs, attendees.length, settings),
      bookingCode: r.bookingCode,
      qrToken: r.qrToken,
      attendees,
    };
  });
}
