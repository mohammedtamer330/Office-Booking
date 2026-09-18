export const dynamic = "force-dynamic";

import { getRoomTimelines } from "@/lib/room-timeline";
import { getMonthOverview } from "@/lib/month-overview";
import { getSettings } from "@/lib/settings";
import { todayInAppTz } from "@/lib/time";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { RoomAvailabilityBoard } from "@/components/booking/room-availability-board";
import { MonthCalendar } from "@/components/booking/month-calendar";
import Link from "next/link";

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; month?: string; room?: string }>;
}) {
  const sp = await searchParams;
  const today = todayInAppTz();
  const roomSlug = sp.room;
  const roomParam = roomSlug ? `&room=${roomSlug}` : "";

  const selectedRoom = roomSlug ? await db.query.rooms.findFirst({ where: eq(rooms.slug, roomSlug) }) : null;

  // --- Day view -----------------------------------------------------------
  if (sp.date) {
    const allEntries = await getRoomTimelines(sp.date);
    const entries = selectedRoom ? allEntries.filter((e) => e.room.slug === selectedRoom.slug) : allEntries;
    const monthOfDate = sp.date.slice(0, 7);

    return (
      <div className="mx-auto max-w-xl px-5 py-10">
        <div className="mb-6">
          <Link
            href={`/availability?month=${monthOfDate}${roomParam}`}
            className="text-sm text-muted hover:text-ink"
          >
            ← Back to month
          </Link>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-ink">
                {selectedRoom ? selectedRoom.name : "Room availability"}
              </h1>
              <p className="mt-1 text-sm text-muted tabular">{sp.date}</p>
            </div>
            <Link href="/" className="text-sm text-ink underline decoration-line-strong hover:decoration-ink">
              Book a room →
            </Link>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-center gap-4 text-sm">
          <Link href={`/availability?date=${shiftDate(sp.date, -1)}${roomParam}`} className="text-muted hover:text-ink">
            ← Previous day
          </Link>
          <Link href={`/availability${roomParam ? `?room=${roomSlug}` : ""}`} className="font-medium text-brand hover:underline">
            Today
          </Link>
          <Link href={`/availability?date=${shiftDate(sp.date, 1)}${roomParam}`} className="text-muted hover:text-ink">
            Next day →
          </Link>
        </div>

        <RoomAvailabilityBoard entries={entries} />
      </div>
    );
  }

  // --- Month view (default) ------------------------------------------------
  const settings = await getSettings();
  const month = sp.month ?? today.slice(0, 7);
  const overview = await getMonthOverview(month, roomSlug);

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {selectedRoom ? selectedRoom.name : "Room availability"}
          </h1>
          <p className="mt-1 text-sm text-muted">Pick a day to see its hour-by-hour schedule.</p>
        </div>
        <Link href="/" className="text-sm text-ink underline decoration-line-strong hover:decoration-ink">
          Book →
        </Link>
      </div>

      {selectedRoom && (
        <Link href="/availability" className="mb-3 inline-block text-xs text-muted hover:text-ink">
          ← All rooms
        </Link>
      )}

      <div className="rounded-xl border border-line bg-surface p-4">
        <MonthCalendar
          month={month}
          today={today}
          overview={overview}
          roomSlug={roomSlug}
          bookingStartDate={settings.bookingStartDate}
          bookingEndDate={settings.bookingEndDate}
        />
      </div>

      <Link
        href={`/availability?date=${today}${roomParam}`}
        className="mt-4 block text-center text-sm font-medium text-brand hover:underline"
      >
        Jump to today →
      </Link>
    </div>
  );
}
