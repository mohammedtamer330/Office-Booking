import { db } from "@/db";
import { bookings, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { combineDateAndTimeInAppTz, nowInAppTz, todayInAppTz } from "@/lib/time";

export type RoomTimelineBooking = {
  id: string;
  startTime: string;
  endTime: string;
  personName: string;
  functionLabel: string;
  functionColor: string | null;
};

export type RoomTimelineEntry = {
  room: { id: string; name: string; slug: string; description: string | null };
  bookings: RoomTimelineBooking[];
  isToday: boolean;
  liveStatus: "Occupied" | "Available";
  current: RoomTimelineBooking | null;
  next: RoomTimelineBooking | null;
};

/**
 * Room-by-room bookings for one day, plus a live occupied/available read for
 * "today" — the data behind the public availability board so anyone can see
 * what's booked before starting the wizard, without needing admin access.
 */
export async function getRoomTimelines(date: string): Promise<RoomTimelineEntry[]> {
  const isToday = date === todayInAppTz();
  const now = nowInAppTz();

  const allRooms = await db.select().from(rooms).where(eq(rooms.active, true));
  const dayBookings = await db.query.bookings.findMany({
    where: eq(bookings.date, date),
    with: { person: { with: { function: true } }, room: true },
  });

  return allRooms.map((room) => {
    const roomBookings = dayBookings
      .filter((b) => b.roomId === room.id && b.status !== "CANCELLED" && b.status !== "NO_SHOW")
      .map((b) => ({
        id: b.id,
        startTime: b.startTime,
        endTime: b.endTime,
        personName: b.person.name,
        functionLabel: b.person.function.label,
        functionColor: b.person.function.color,
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    let current: RoomTimelineBooking | null = null;
    let next: RoomTimelineBooking | null = null;

    if (isToday) {
      for (const b of roomBookings) {
        const start = combineDateAndTimeInAppTz(date, b.startTime);
        const end = combineDateAndTimeInAppTz(date, b.endTime);
        if (now >= start && now <= end && !current) current = b;
        if (start > now && !next) next = b;
      }
    }

    return {
      room: { id: room.id, name: room.name, slug: room.slug, description: room.description },
      bookings: roomBookings,
      isToday,
      liveStatus: current ? "Occupied" : "Available",
      current,
      next,
    };
  });
}
