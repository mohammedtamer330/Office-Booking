import { toZonedTime, fromZonedTime, format } from "date-fns-tz";

export const APP_TIMEZONE = "Africa/Cairo";

/** The current moment, expressed in the app's fixed timezone. */
export function nowInAppTz(): Date {
  return toZonedTime(new Date(), APP_TIMEZONE);
}

/**
 * Combines a booking's stored date + time-of-day (both interpreted as
 * Africa/Cairo, matching how they were entered) into a single UTC instant
 * for comparisons against "now".
 */
export function combineDateAndTimeInAppTz(dateStr: string, timeStr: string): Date {
  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const localString = `${dateStr}T${normalizedTime}`;
  return fromZonedTime(localString, APP_TIMEZONE);
}

export function formatInAppTz(date: Date, pattern: string): string {
  return format(date, pattern, { timeZone: APP_TIMEZONE });
}

export function todayInAppTz(): string {
  return formatInAppTz(new Date(), "yyyy-MM-dd");
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}
