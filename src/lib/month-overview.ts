import { db } from "@/db";
import { bookings, rooms } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";

export type MonthDayOverview = {
  date: string; // YYYY-MM-DD
  count: number;
  colors: string[]; // distinct function colors that day, for dot display
};

/**
 * Per-day booking counts and function-color dots for one calendar month,
 * optionally scoped to a single room (by slug) — the data behind the
 * month → day → hour drill-down on /availability.
 */
export async function getMonthOverview(monthStr: string, roomSlug?: string): Promise<Map<string, MonthDayOverview>> {
  const [year, month] = monthStr.split("-").map(Number);
  const firstDay = `${monthStr}-01`;
  const lastDayNum = new Date(year, month, 0).getDate();
  const lastDay = `${monthStr}-${String(lastDayNum).padStart(2, "0")}`;

  const conditions = [gte(bookings.date, firstDay), lte(bookings.date, lastDay)];

  if (roomSlug) {
    const room = await db.query.rooms.findFirst({ where: eq(rooms.slug, roomSlug) });
    if (room) conditions.push(eq(bookings.roomId, room.id));
  }

  const rows = await db.query.bookings.findMany({
    where: and(...conditions),
    with: { person: { with: { function: true } } },
  });

  const map = new Map<string, MonthDayOverview>();
  for (const b of rows) {
    if (b.status === "CANCELLED" || b.status === "NO_SHOW") continue;
    const existing = map.get(b.date) ?? { date: b.date, count: 0, colors: [] };
    existing.count++;
    const color = b.person.function.color ?? "#5B6470";
    if (!existing.colors.includes(color) && existing.colors.length < 4) existing.colors.push(color);
    map.set(b.date, existing);
  }
  return map;
}
