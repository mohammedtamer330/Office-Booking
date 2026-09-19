"use client";

import { CalendarDays } from "lucide-react";
import { BookingCard } from "@/components/office/booking-card";
import { relativeDayLabel, type BookingSummary } from "@/lib/schedule-types";

export function UpcomingBookings({
  bookings,
  today,
  nowMs,
}: {
  bookings: BookingSummary[];
  today: string;
  nowMs: number;
}) {
  return (
    <section aria-labelledby="upcoming-heading">
      <h2 id="upcoming-heading" className="text-xl font-semibold text-ink">
        Upcoming bookings
      </h2>
      {bookings.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-surface px-5 py-8 text-center">
          <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-black/[0.05] text-ink-soft">
            <CalendarDays className="size-5" />
          </span>
          <p className="mt-3 text-[15px] font-semibold text-ink">Nothing booked ahead</p>
          <p className="mt-1 text-sm text-muted">Be the first team to book a room.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-2.5 md:grid-cols-2">
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              nowMs={nowMs}
              dayLabel={relativeDayLabel(b.date, today)}
              showAttendance={false}
              showCheckIn={false}
            />
          ))}
        </div>
      )}
    </section>
  );
}
