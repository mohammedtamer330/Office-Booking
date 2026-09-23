export const dynamic = "force-dynamic";

import { db } from "@/db";
import { bookings, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { todayInAppTz } from "@/lib/time";
import { buildFunctionBrand } from "@/lib/config/function-branding";
import { Card } from "@/components/ui/card";
import { CalendarDatePicker } from "@/components/admin/calendar-date-picker";
import { PageTransition, StaggerRow } from "@/components/motion/primitives";

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 22;
const PX_PER_HOUR = 56;

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = sp.date ?? todayInAppTz();

  const allRooms = await db.select().from(rooms).where(eq(rooms.active, true));
  const dayBookings = await db.query.bookings.findMany({
    where: eq(bookings.date, date),
    with: { person: { with: { function: true } }, room: true },
  });

  const totalHours = DAY_END_HOUR - DAY_START_HOUR;

  function positionFor(time: string) {
    const [h, m] = time.slice(0, 5).split(":").map(Number);
    const hoursFromStart = h + m / 60 - DAY_START_HOUR;
    return hoursFromStart * PX_PER_HOUR;
  }

  return (
    <PageTransition>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Calendar</h1>
          <p className="mt-1 text-sm text-muted">Day view across all rooms.</p>
        </div>
        <CalendarDatePicker date={date} />
      </div>

      <Card className="mt-5 overflow-x-auto p-4">
        <div className="flex" style={{ minWidth: allRooms.length * 200 + 60 }} key={date}>
          {/* Hour rail */}
          <div className="relative w-14 flex-shrink-0" style={{ height: totalHours * PX_PER_HOUR }}>
            {Array.from({ length: totalHours + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute right-2 -translate-y-2 text-xs text-muted tabular"
                style={{ top: i * PX_PER_HOUR }}
              >
                {String(DAY_START_HOUR + i).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {allRooms.map((room) => {
            const roomBookings = dayBookings.filter((b) => b.roomId === room.id && b.status !== "CANCELLED");
            return (
              <div key={room.id} className="relative flex-1 border-l border-line" style={{ minWidth: 200 }}>
                <div className="sticky top-0 border-b border-line bg-surface px-3 py-2 text-sm font-medium text-ink">
                  {room.name}
                </div>
                <div className="relative" style={{ height: totalHours * PX_PER_HOUR }}>
                  {Array.from({ length: totalHours }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-line"
                      style={{ top: i * PX_PER_HOUR }}
                    />
                  ))}
                  {roomBookings.map((b, i) => {
                    const brand = buildFunctionBrand(b.person.function.color);
                    const top = positionFor(b.startTime);
                    const height = Math.max(positionFor(b.endTime) - top, 24);
                    return (
                      <StaggerRow
                        key={b.id}
                        index={i}
                        className="absolute left-1.5 right-1.5 overflow-hidden rounded-md border px-2 py-1 text-xs transition-shadow duration-150 hover:shadow-[var(--shadow-card)]"
                        style={{
                          top,
                          height,
                          backgroundColor: brand.tint,
                          borderColor: brand.base,
                          color: brand.text,
                        }}
                      >
                        <span title={`${b.person.name} · ${b.startTime.slice(0, 5)}–${b.endTime.slice(0, 5)}`}>
                          <p className="truncate font-medium">{b.person.name}</p>
                          <p className="truncate tabular opacity-80">
                            {b.startTime.slice(0, 5)}–{b.endTime.slice(0, 5)}
                          </p>
                        </span>
                      </StaggerRow>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </PageTransition>
  );
}
