export const dynamic = "force-dynamic";

import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { getDaySchedule, getMonthDays } from "@/lib/schedule";
import { todayInAppTz, nowInAppTz } from "@/lib/time";
import { ScheduleExplorer } from "@/components/office/schedule-explorer";
import { BookRoomButton } from "@/components/office/booking-buttons";
import { ErrorState } from "@/components/ui/error-state";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Room availability: the same calendar + timeline as the homepage, optionally narrowed to one room. */
export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; month?: string; room?: string }>;
}) {
  const sp = await searchParams;
  const today = todayInAppTz();

  // Old links used ?month=YYYY-MM; honour them by landing on the 1st of that month.
  let initialDate = today;
  if (sp.date && DATE_RE.test(sp.date) && !Number.isNaN(Date.parse(sp.date))) initialDate = sp.date;
  else if (sp.month && /^\d{4}-\d{2}$/.test(sp.month)) initialDate = `${sp.month}-01`;

  const data = await Promise.all([
    getSettings(),
    sp.room ? db.query.rooms.findFirst({ where: eq(rooms.slug, sp.room) }) : Promise.resolve(undefined),
    getDaySchedule(initialDate),
    getMonthDays(initialDate.slice(0, 7)),
  ]).catch(() => null);

  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <ErrorState message="We couldn't load the schedule. Please refresh in a moment." />
      </div>
    );
  }
  const [settings, room, schedule, monthDays] = data;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {room && (
            <Link href="/availability" className="text-xs text-muted hover:text-ink">
              ← All rooms
            </Link>
          )}
          <h1 className="text-2xl font-semibold text-ink">{room ? room.name : "Room availability"}</h1>
        </div>
        <BookRoomButton size="touch" className="sm:hidden" />
      </div>
      <ScheduleExplorer
        heading={room ? "Schedule" : "All rooms"}
        today={today}
        nowMs={nowInAppTz().getTime()}
        initialDate={initialDate}
        initialSchedule={schedule}
        initialMonthDays={monthDays}
        minBookingMinutes={settings.minBookingMinutes}
        bookingStartDate={settings.bookingStartDate}
        bookingEndDate={settings.bookingEndDate}
        roomSlug={room?.slug}
        showBookButton
      />
    </div>
  );
}
