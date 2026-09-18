import { db } from "@/db";
import { bookings } from "@/db/schema";
import { and, eq, notInArray } from "drizzle-orm";

export type BookedSlot = { startTime: string; endTime: string; status: string };

/**
 * Returns the existing (non-cancelled, non-no-show) bookings for a room on a
 * given date, so the frontend can render an availability timeline and block
 * out taken slots as the user picks a start/end time. This is a UX aid only
 * — the authoritative conflict check is the server-side create path plus the
 * database's own exclusion constraint.
 */
export async function getBookedSlots(roomId: string, date: string): Promise<BookedSlot[]> {
  const rows = await db
    .select({ startTime: bookings.startTime, endTime: bookings.endTime, status: bookings.status })
    .from(bookings)
    .where(
      and(
        eq(bookings.roomId, roomId),
        eq(bookings.date, date),
        notInArray(bookings.status, ["CANCELLED", "NO_SHOW"]),
      ),
    );
  return rows;
}
