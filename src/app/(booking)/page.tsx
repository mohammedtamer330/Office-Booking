export const dynamic = "force-dynamic";

import { getBookingReferenceData } from "@/lib/reference-data";
import { getRoomTimelines } from "@/lib/room-timeline";
import { todayInAppTz, nowMinutesInAppTz } from "@/lib/time";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { RoomAvailabilityBoard } from "@/components/booking/room-availability-board";
import type { BookingReferenceBundle } from "@/lib/types";
import Link from "next/link";

export default async function BookingHomePage() {
  const [data, timelines] = await Promise.all([getBookingReferenceData(), getRoomTimelines(todayInAppTz())]);

  if (!data.settings) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center text-muted">
        The system hasn&apos;t been configured yet. Run <code>npm run db:seed</code> to get started.
      </div>
    );
  }

  const bundle: BookingReferenceBundle = {
    people: data.people,
    roles: data.roles as BookingReferenceBundle["roles"],
    functions: data.functions,
    rooms: data.rooms,
    roleFunctionLinks: data.roleFunctionLinks,
    roomPermissions: data.roomPermissions,
    settings: {
      bookingStartDate: data.settings.bookingStartDate,
      bookingEndDate: data.settings.bookingEndDate,
      minBookingMinutes: data.settings.minBookingMinutes,
      maxBookingMinutes: data.settings.maxBookingMinutes,
      checkInWindowBeforeMinutes: data.settings.checkInWindowBeforeMinutes,
      checkInWindowAfterMinutes: data.settings.checkInWindowAfterMinutes,
      lateCheckInPolicy: data.settings.lateCheckInPolicy as BookingReferenceBundle["settings"]["lateCheckInPolicy"],
      noShowGraceMinutes: data.settings.noShowGraceMinutes,
      cancellationCutoffMinutes: data.settings.cancellationCutoffMinutes,
    },
  };

  const occupiedCount = timelines.filter((t) => t.liveStatus === "Occupied").length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 lg:py-14">
      <div className="mb-10 max-w-xl">
        <p className="text-sm font-medium text-brand">AIESEC in Suez</p>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight text-ink sm:text-3xl">
          Book a room in a few taps.
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          {occupiedCount === 0
            ? "All three rooms are free right now — pick one below."
            : `${occupiedCount} of ${timelines.length} rooms are in use right now — check the board before you book.`}
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-12">
        <div>
          <div className="flex items-baseline justify-between lg:sticky lg:top-20">
            <h2 className="text-sm font-semibold text-ink">Room status</h2>
            <Link href="/availability" className="text-xs text-muted hover:text-ink">
              Full timeline →
            </Link>
          </div>
          <div className="mt-3 lg:sticky lg:top-28">
            <RoomAvailabilityBoard entries={timelines} compact />
          </div>
        </div>

        <div>
          <BookingWizard data={bundle} today={todayInAppTz()} nowMinutes={nowMinutesInAppTz()} />
        </div>
      </div>
    </div>
  );
}
