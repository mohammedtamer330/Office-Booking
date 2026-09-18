export const dynamic = "force-dynamic";

import { db } from "@/db";
import { bookings, rooms } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingRowActions } from "@/components/admin/booking-row-actions";
import { BookingsFilterBar } from "@/components/admin/bookings-filter-bar";

const PAGE_SIZE = 25;

const STATUS_VARIANT: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  UPCOMING: "info",
  CHECKED_IN: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
  NO_SHOW: "warning",
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    room?: string;
    status?: string;
    date?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [allRooms] = await Promise.all([db.select().from(rooms)]);

  const conditions = [];
  if (sp.room) conditions.push(eq(bookings.roomId, sp.room));
  if (sp.status) conditions.push(eq(bookings.status, sp.status as (typeof bookings.$inferSelect)["status"]));
  if (sp.date) conditions.push(eq(bookings.date, sp.date));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db.query.bookings.findMany({
    where: whereClause,
    with: { person: true, room: true },
    orderBy: (t, { desc }) => [desc(t.date), desc(t.startTime)],
  });

  const filtered = sp.q
    ? rows.filter(
        (b) =>
          b.person.name.toLowerCase().includes(sp.q!.toLowerCase()) ||
          b.bookingCode.toLowerCase().includes(sp.q!.toLowerCase()),
      )
    : rows;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Bookings</h1>
      <p className="mt-1 text-sm text-muted">{filtered.length} total</p>

      <div className="mt-5">
        <BookingsFilterBar rooms={allRooms} current={sp} />
      </div>

      <Card className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-4 py-2.5 font-medium">Code</th>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Room</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Time</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Check-in</th>
              <th className="px-4 py-2.5 font-medium">Check-out</th>
              <th className="px-4 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 tabular text-xs text-muted">{b.bookingCode}</td>
                <td className="px-4 py-2.5">{b.person.name}</td>
                <td className="px-4 py-2.5">{b.room.name}</td>
                <td className="px-4 py-2.5 tabular">{b.date}</td>
                <td className="px-4 py-2.5 tabular">
                  {b.startTime.slice(0, 5)}–{b.endTime.slice(0, 5)}
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant={STATUS_VARIANT[b.status]}>{b.status.replace("_", " ")}</Badge>
                </td>
                <td className="px-4 py-2.5 tabular text-xs text-muted">
                  {b.actualCheckInAt ? new Date(b.actualCheckInAt).toLocaleTimeString() : "—"}
                </td>
                <td className="px-4 py-2.5 tabular text-xs text-muted">
                  {b.actualCheckOutAt ? new Date(b.actualCheckOutAt).toLocaleTimeString() : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <BookingRowActions bookingId={b.id} status={b.status} hasCheckedIn={!!b.actualCheckInAt} />
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted">
                  No bookings match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <p className="mt-3 text-center text-xs text-muted">
          Page {page} of {totalPages}
        </p>
      )}
    </div>
  );
}
