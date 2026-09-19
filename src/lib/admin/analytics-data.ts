import { db } from "@/db";
import { bookingAttendees, bookings } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";

export async function getAnalytics(startDate: string, endDate: string) {
  const rows = await db.query.bookings.findMany({
    where: and(gte(bookings.date, startDate), lte(bookings.date, endDate)),
    with: { person: { with: { role: true, function: true } }, room: true },
  });

  const total = rows.length;
  const checkedInOrCompleted = rows.filter((b) => b.status === "CHECKED_IN" || b.status === "COMPLETED").length;
  const noShows = rows.filter((b) => b.status === "NO_SHOW").length;
  const cancelled = rows.filter((b) => b.status === "CANCELLED").length;

  const checkInRate = total > 0 ? Math.round((checkedInOrCompleted / total) * 100) : 0;
  const noShowRate = total > 0 ? Math.round((noShows / total) * 100) : 0;
  const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

  const durations = rows
    .filter((b) => b.actualCheckInAt && b.actualCheckOutAt)
    .map((b) => (new Date(b.actualCheckOutAt!).getTime() - new Date(b.actualCheckInAt!).getTime()) / 60000);
  const avgDurationMinutes =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  // Bookings per day
  const byDayMap = new Map<string, number>();
  for (const b of rows) byDayMap.set(b.date, (byDayMap.get(b.date) ?? 0) + 1);
  const byDay = Array.from(byDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // Most booked room / room utilization
  const byRoomMap = new Map<string, { name: string; count: number }>();
  for (const b of rows) {
    const existing = byRoomMap.get(b.roomId) ?? { name: b.room.name, count: 0 };
    existing.count++;
    byRoomMap.set(b.roomId, existing);
  }
  const byRoom = Array.from(byRoomMap.values()).sort((a, b) => b.count - a.count);

  // Peak hours
  const byHourMap = new Map<number, number>();
  for (const b of rows) {
    const hour = parseInt(b.startTime.slice(0, 2), 10);
    byHourMap.set(hour, (byHourMap.get(hour) ?? 0) + 1);
  }
  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: byHourMap.get(h) ?? 0 })).filter(
    (h) => h.count > 0,
  );

  // Usage by role
  const byRoleMap = new Map<string, number>();
  for (const b of rows) {
    const label = b.person.role.label;
    byRoleMap.set(label, (byRoleMap.get(label) ?? 0) + 1);
  }
  const byRole = Array.from(byRoleMap.entries()).map(([label, count]) => ({ label, count }));

  // Usage by function
  const byFunctionMap = new Map<string, { count: number; color: string | null }>();
  for (const b of rows) {
    const label = b.person.function.label;
    const existing = byFunctionMap.get(label) ?? { count: 0, color: b.person.function.color };
    existing.count++;
    byFunctionMap.set(label, existing);
  }
  const byFunction = Array.from(byFunctionMap.entries()).map(([label, v]) => ({ label, ...v }));

  // Attendance: who actually showed up (one row per person who checked in), not just whether the owner did.
  const attendeeRows = await db
    .select({ bookingId: bookingAttendees.bookingId, status: bookingAttendees.status, date: bookings.date })
    .from(bookingAttendees)
    .innerJoin(bookings, eq(bookingAttendees.bookingId, bookings.id))
    .where(and(gte(bookings.date, startDate), lte(bookings.date, endDate)));

  const totalAttendance = attendeeRows.length;
  const lateArrivals = attendeeRows.filter((a) => a.status === "LATE").length;
  const lateArrivalRate = totalAttendance > 0 ? Math.round((lateArrivals / totalAttendance) * 100) : 0;
  const attendedBookings = new Set(attendeeRows.map((a) => a.bookingId)).size;
  const avgAttendeesPerBooking = attendedBookings > 0 ? Math.round((totalAttendance / attendedBookings) * 10) / 10 : 0;
  const attendanceByDayMap = new Map<string, number>();
  for (const a of attendeeRows) attendanceByDayMap.set(a.date, (attendanceByDayMap.get(a.date) ?? 0) + 1);
  const attendanceByDay = Array.from(attendanceByDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    total,
    totalAttendance,
    avgAttendeesPerBooking,
    lateArrivalRate,
    attendanceByDay,
    checkInRate,
    noShowRate,
    cancellationRate,
    avgDurationMinutes,
    byDay,
    byRoom,
    byHour,
    byRole,
    byFunction,
  };
}
