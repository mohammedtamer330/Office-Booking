export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getDaySchedule, getMonthDays, getUpcomingBookings } from "@/lib/schedule";
import { todayInAppTz, nowInAppTz } from "@/lib/time";
import { BookRoomButton } from "@/components/office/booking-buttons";
import { ScheduleExplorer } from "@/components/office/schedule-explorer";
import { TodaySection } from "@/components/office/today-section";
import { UpcomingBookings } from "@/components/office/upcoming-bookings";
import { RoomOverview } from "@/components/office/room-overview";
import { ErrorState } from "@/components/ui/error-state";
import { formatDayLong } from "@/lib/schedule-types";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/motion/primitives";

export default async function BookingHomePage() {
  const today = todayInAppTz();
  const nowMs = nowInAppTz().getTime();

  const data = await Promise.all([
    getSettings(),
    getDaySchedule(today),
    getMonthDays(today.slice(0, 7)),
    getUpcomingBookings(6),
  ]).catch(() => null);

  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <ErrorState message="We couldn't load the office schedule. Please refresh in a moment." />
      </div>
    );
  }

  const [settings, schedule, monthDays, upcoming] = data;


  return (
    <PageTransition className="mx-auto max-w-5xl space-y-12 px-5 py-8 sm:py-10 lg:space-y-14">
      {/* Hero — content staggers in on load: eyebrow, then heading, then
          actions, each a beat behind the last. */}
      <StaggerContainer
        className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
        stagger={0.08}
      >
        <div className="max-w-xl">
          <StaggerItem>
            <p className="text-sm font-medium text-brand">AIESEC in Suez · {formatDayLong(today)}</p>
          </StaggerItem>
          <StaggerItem>
            <h1 className="mt-1.5 text-[28px] font-semibold leading-tight text-ink sm:text-[34px]">
              Book a room for your team.
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-2 text-[15px] text-muted">
              One person books. Everyone who shows up checks in with their own name, so the office always knows who
              was in the room.
            </p>
          </StaggerItem>
        </div>
        <StaggerItem className="flex items-center gap-3">
          <BookRoomButton size="touch" className="flex-1 sm:flex-none">
            Book your room
          </BookRoomButton>
          <Link
            href="/check-in"
            className="inline-flex h-11 items-center rounded-lg px-3 text-sm font-medium text-ink-soft transition-colors hover:bg-black/[0.05] active:scale-[0.97]"
          >
            I have a booking code
          </Link>
        </StaggerItem>
      </StaggerContainer>

      <ScheduleExplorer
        today={today}
        nowMs={nowMs}
        initialDate={today}
        initialSchedule={schedule}
        initialMonthDays={monthDays}
        minBookingMinutes={settings.minBookingMinutes}
        bookingStartDate={settings.bookingStartDate}
        bookingEndDate={settings.bookingEndDate}
      />

      <TodaySection schedule={schedule} nowMs={nowMs} />

      <div className="grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-8">
        <UpcomingBookings bookings={upcoming} today={today} nowMs={nowMs} />
        <RoomOverview schedule={schedule} nowMs={nowMs} className="lg:self-start" />
      </div>
    </PageTransition>
  );
}
