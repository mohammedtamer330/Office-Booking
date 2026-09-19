/**
 * Plain, serializable shapes shared by the server loaders (lib/schedule.ts)
 * and the client components. Nothing in here imports the database, so it is
 * safe to pull into a client bundle.
 */

export type BookingStatus = "UPCOMING" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export type BookingSummary = {
  id: string;
  roomId: string;
  roomName: string;
  roomSlug: string;
  date: string; // YYYY-MM-DD (Africa/Cairo)
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  status: BookingStatus;
  ownerId: string;
  ownerName: string;
  ownerPosition: string | null;
  functionId: string;
  functionLabel: string;
  functionColor: string | null;
  roleLabel: string;
  attendeeCount: number;
  // Real instants (epoch ms) so the browser can tell whether check-in is open
  // right now without another round trip. The server re-checks on every attempt.
  startsAtMs: number;
  endsAtMs: number;
  opensAtMs: number;
  lateAfterMs: number;
  opensAtLabel: string; // Cairo wall-clock, HH:MM
  blockLate: boolean; // settings.lateCheckInPolicy === "BLOCK"
};

export type RoomInfo = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  requiresPassword: boolean;
};

export type DaySchedule = {
  date: string;
  rooms: RoomInfo[];
  bookings: BookingSummary[];
};

export type MonthDay = {
  date: string;
  count: number;
  colors: string[]; // distinct function colours, for the dots
  load: number; // 0..1 share of the day's room-hours that are booked
};

export type AttendeeRow = {
  id: string;
  name: string;
  checkedInAt: string; // ISO instant
  status: "ON_TIME" | "LATE";
  method: "QR" | "BOOKING_PAGE" | "ADMIN_MANUAL";
};

export type BookingDetails = {
  summary: BookingSummary;
  attendees: AttendeeRow[];
  /** Names of people in the owner's function — offered as typing suggestions only, never as an expected roster. */
  suggestions: string[];
};

export type CheckInAvailability =
  | { open: true; late: boolean }
  | { open: false; reason: "not_yet" | "ended" | "closed" | "blocked_late"; message: string };

/** Mirrors the server's rules so buttons can say why they're disabled. The server is still the authority. */
export function getCheckInAvailability(b: BookingSummary, nowMs: number): CheckInAvailability {
  if (b.status === "CANCELLED") return { open: false, reason: "closed", message: "This booking was cancelled." };
  if (b.status === "NO_SHOW") return { open: false, reason: "closed", message: "Marked as a no-show." };
  if (b.status === "COMPLETED") return { open: false, reason: "closed", message: "This booking is complete." };
  if (nowMs > b.endsAtMs) return { open: false, reason: "ended", message: "This booking has ended." };
  if (nowMs < b.opensAtMs)
    return { open: false, reason: "not_yet", message: `Check-in opens at ${formatTime12(b.opensAtLabel)}.` };
  const late = nowMs > b.lateAfterMs;
  if (late && b.blockLate)
    return { open: false, reason: "blocked_late", message: "The check-in window has closed." };
  return { open: true, late };
}

// ---------------------------------------------------------------------------
// Formatting helpers (pure, timezone-independent — the strings are already Cairo wall-clock)
// ---------------------------------------------------------------------------

/** "19:00" -> "7:00 PM" */
export function formatTime12(time: string): string {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "19:00","21:00" -> "7:00 – 9:00 PM"; mixed meridiems keep both. */
export function formatRange(start: string, end: string): string {
  const s = formatTime12(start);
  const e = formatTime12(end);
  return s.slice(-2) === e.slice(-2) ? `${s.slice(0, -3)} – ${e}` : `${s} – ${e}`;
}

const dayFormat = (opts: Intl.DateTimeFormatOptions) => (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

/** "2026-09-20" -> "Sunday, September 20" */
export const formatDayLong = dayFormat({ weekday: "long", month: "long", day: "numeric" });
/** "2026-09-20" -> "Sep 20" */
export const formatDayShort = dayFormat({ month: "short", day: "numeric" });
/** "2026-09-20" -> "Sunday" */
export const formatWeekday = dayFormat({ weekday: "long" });

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "Today" | "Tomorrow" | "Tuesday" (within a week) | "Sep 28" */
export function relativeDayLabel(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  const diff = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  if (diff > 1 && diff < 7) return formatWeekday(date);
  return formatDayShort(date);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Plain-English attendance count, e.g. "3 checked in". */
export function attendanceLabel(count: number): string {
  return count === 0 ? "No one checked in yet" : `${count} checked in`;
}
