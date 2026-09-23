"use client";

import { CalendarCheck2 } from "lucide-react";
import { BookingCard } from "@/components/office/booking-card";
import { useOfficeUi } from "@/components/office/office-ui-provider";
import { Button } from "@/components/ui/button";
import { useNow } from "@/lib/use-now";
import { formatDayLong, type DaySchedule } from "@/lib/schedule-types";
import { AnimatedNumber, FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/primitives";

export function TodaySection({ schedule, nowMs }: { schedule: DaySchedule; nowMs: number }) {
  const { openBooking, canBook } = useOfficeUi();
  const now = useNow(nowMs, 30_000);

  const bookings = [...schedule.bookings].sort((a, b) => a.startsAtMs - b.startsAtMs);
  const roomsActive = new Set(bookings.map((b) => b.roomId)).size;
  const peopleCheckedIn = bookings.reduce((sum, b) => sum + b.attendeeCount, 0);

  // Running and coming up first; finished ones sink to the bottom.
  const ordered = [...bookings].sort((a, b) => {
    const fa = now >= a.endsAtMs ? 1 : 0;
    const fb = now >= b.endsAtMs ? 1 : 0;
    return fa - fb || a.startsAtMs - b.startsAtMs;
  });

  return (
    <section id="today" aria-labelledby="today-heading" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="today-heading" className="text-xl font-semibold text-ink">
            Today
          </h2>
          <p className="text-sm text-muted">{formatDayLong(schedule.date)}</p>
        </div>
        <dl className="flex gap-5 text-sm">
          <Stat value={roomsActive} label={roomsActive === 1 ? "room active" : "rooms active"} />
          <Stat value={bookings.length} label={bookings.length === 1 ? "booking" : "bookings"} />
          <Stat value={peopleCheckedIn} label="checked in" />
        </dl>
      </div>

      <div className="mt-4 space-y-2.5">
        {ordered.length === 0 ? (
          <FadeIn className="rounded-xl border border-dashed border-line-strong bg-surface px-5 py-8 text-center">
            <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-success/10 text-success">
              <CalendarCheck2 className="size-5" />
            </span>
            <p className="mt-3 text-[15px] font-semibold text-ink">No bookings today</p>
            <p className="mt-1 text-sm text-muted">Looks like the office is free.</p>
            {canBook && (
              <Button size="touch" className="mt-4" onClick={() => openBooking({ date: schedule.date })}>
                Book your room
              </Button>
            )}
          </FadeIn>
        ) : (
          <StaggerContainer className="space-y-2.5" stagger={0.05}>
            {ordered.map((b) => (
              <StaggerItem key={b.id}>
                <BookingCard booking={b} nowMs={now} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="sr-only">{label}</dt>
      <dd className="text-lg font-semibold text-ink tabular overflow-hidden">
        <AnimatedNumber value={value} />
      </dd>
      <span className="text-muted" aria-hidden>
        {label}
      </span>
    </div>
  );
}
