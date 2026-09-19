import { toZonedTime, fromZonedTime, format } from "date-fns-tz";

export const APP_TIMEZONE = "Africa/Cairo";

/**
 * The current moment as a real instant.
 *
 * Every caller compares this against `combineDateAndTimeInAppTz` (a true UTC
 * instant) or stores it as a timestamp, so it must be the real "now" — NOT a
 * `toZonedTime()`-shifted Date. A shifted Date only lines up with real
 * instants when the server itself runs in Africa/Cairo (a dev laptop), and
 * drifts by the UTC offset (3h in summer) on Vercel, which runs in UTC.
 * Use `formatInAppTz` when you need Cairo wall-clock text.
 */
export function nowInAppTz(): Date {
  return new Date();
}

/**
 * Combines a booking's stored date + time-of-day (both interpreted as
 * Africa/Cairo, matching how they were entered) into a single UTC
 * instant for comparisons against "now".
 */
export function combineDateAndTimeInAppTz(dateStr: string, timeStr: string): Date {
  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const localString = `${dateStr}T${normalizedTime}`;
  return fromZonedTime(localString, APP_TIMEZONE);
}

/**
 * Formats an instant as Cairo wall-clock text. date-fns-tz's `format` only
 * uses its `timeZone` option for timezone *tokens* (z, X, xxx); the clock
 * fields come from the Date itself, so the instant must be converted with
 * `toZonedTime` first or the output silently uses the server's timezone.
 */
export function formatInAppTz(date: Date, pattern: string): string {
  return format(toZonedTime(date, APP_TIMEZONE), pattern, { timeZone: APP_TIMEZONE });
}

export function todayInAppTz(): string {
  return formatInAppTz(new Date(), "yyyy-MM-dd");
}

export function nowMinutesInAppTz(): number {
  const parts = formatInAppTz(new Date(), "HH:mm").split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}
