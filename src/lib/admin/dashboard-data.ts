import { db } from "@/db";
import { bookings, rooms } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { todayInAppTz, nowInAppTz, combineDateAndTimeInAppTz } from "@/lib/time";

export async function getDashboardData() {
  const today = todayInAppTz();

  const todaysBookings = await db.query.bookings.findMany({
    where: eq(bookings.date, today),
    with: { person: { with: { function: true } }, room: true },
    orderBy: [asc(bookings.startTime)],
  });

  const counts = {
    today: todaysBookings.length,
    checkedIn: todaysBookings.filter((b) => b.status === "CHECKED_IN").length,
    upcoming: todaysBookings.filter((b) => b.status === "UPCOMING").length,
    completedToday: todaysBookings.filter((b) => b.status === "COMPLETED").length,
    noShows: todaysBookings.filter((b) => b.status === "NO_SHOW").length,
    cancelled: todaysBookings.filter((b) => b.status === "CANCELLED").length,
  };

  const allRooms = await db.select().from(rooms).where(eq(rooms.active, true));
  const now = nowInAppTz();

  const liveRooms = allRooms.map((room) => {
    const roomBookingsToday = todaysBookings.filter((b) => b.roomId === room.id);
    const current = roomBookingsToday.find((b) => {
      if (b.status === "CANCELLED" || b.status === "NO_SHOW") return false;
      const start = combineDateAndTimeInAppTz(b.date, b.startTime);
      const end = combineDateAndTimeInAppTz(b.date, b.endTime);
      return now >= start && now <= end && b.status !== "COMPLETED";
    });
    const next = roomBookingsToday
      .filter((b) => b.status === "UPCOMING")
      .find((b) => combineDateAndTimeInAppTz(b.date, b.startTime) > now);

    let status: "Occupied" | "Upcoming" | "Available" = "Available";
    if (current) status = "Occupied";
    else if (next) status = "Upcoming";

    return { room, status, current, next };
  });

  return { todaysBookings, counts, liveRooms };
}
