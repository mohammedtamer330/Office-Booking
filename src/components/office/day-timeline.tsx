"use client";

import { DoorOpen, Lock, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { FunctionChip } from "@/components/office/function-chip";
import { useOfficeUi } from "@/components/office/office-ui-provider";
import { buildFunctionBrand } from "@/lib/config/function-branding";
import { buildSegments, minToTime, roomLiveState, TL_END_MIN, TL_START_MIN, toMin } from "@/lib/timeline";
import { formatDayLong, formatRange, formatTime12, type BookingSummary, type DaySchedule } from "@/lib/schedule-types";
import { cn } from "@/lib/utils";

const TOTAL = TL_END_MIN - TL_START_MIN;
const TICKS = [8, 10, 12, 14, 16, 18, 20, 22];

export function DayTimeline({
  date,
  today,
  schedule,
  state,
  onRetry,
  nowMs,
  nowMin,
  minBookingMinutes,
  bookingStartDate,
  bookingEndDate,
}: {
  date: string;
  today: string;
  schedule: DaySchedule | null;
  state: "loading" | "error" | "ready";
  onRetry: () => void;
  nowMs: number;
  nowMin: number;
  minBookingMinutes: number;
  bookingStartDate: string;
  bookingEndDate: string;
}) {
  const { openBooking, canBook } = useOfficeUi();

  if (state === "error") return <ErrorState onRetry={onRetry} />;
  if (state === "loading" || !schedule) return <TimelineSkeleton />;

  const isPast = date < today;
  const isToday = date === today;
  const inWindow = date >= bookingStartDate && date <= bookingEndDate;
  const dayBookable = !isPast && inWindow;
  const total = schedule.bookings.length;

  return (
    <div className="animate-fade-swap space-y-3" key={date}>
      {total === 0 && (
        <div className="rounded-xl border border-dashed border-line-strong bg-surface px-5 py-6 text-center">
          <p className="text-[15px] font-semibold text-ink">
            {isPast ? "No bookings on this day" : isToday ? "No bookings today" : "No bookings yet"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {isPast
              ? "Nothing was booked."
              : isToday
                ? "Looks like the office is free."
                : "Be the first team to book a room."}
          </p>
          {dayBookable && canBook && (
            <Button size="touch" className="mt-4" onClick={() => openBooking({ date })}>
              Book your room
            </Button>
          )}
        </div>
      )}
      {!isPast && !inWindow && (
        <p className="rounded-lg bg-black/[0.04] px-3 py-2 text-sm text-ink-soft">
          Bookings aren&apos;t open for {formatDayLong(date)}. They run from {formatDayLong(bookingStartDate)} to{" "}
          {formatDayLong(bookingEndDate)}.
        </p>
      )}

      {schedule.rooms.map((room) => {
        const roomBookings = schedule.bookings.filter((b) => b.roomId === room.id);
        const segments = buildSegments(roomBookings, { isPast, isToday, nowMin, minBookingMinutes, dayBookable });
        const live = isToday ? roomLiveState(roomBookings, nowMs) : null;
        const Icon = room.requiresPassword ? Lock : DoorOpen;
        return (
          <section
            key={room.id}
            aria-label={`${room.name} timeline`}
            className="rounded-xl border border-line bg-surface p-4 transition-shadow hover:shadow-[var(--shadow-card)]"
          >
            <header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-full bg-black/[0.05] text-ink-soft">
                  <Icon className="size-4" />
                </span>
                <h3 className="font-semibold text-ink">{room.name}</h3>
              </div>
              {live ? (
                <LiveBadge occupied={!!live.current} until={live.current ? formatTime12(live.current.endTime) : null} />
              ) : (
                <span className="text-xs text-muted">
                  {roomBookings.length === 0
                    ? isPast
                      ? "No bookings"
                      : "Free all day"
                    : `${roomBookings.length} booking${roomBookings.length === 1 ? "" : "s"}`}
                </span>
              )}
            </header>

            <DayBar bookings={roomBookings} showNow={isToday} nowMin={nowMin} />

            <ul className="mt-3 space-y-1.5">
              {segments.length === 0 && (
                <li className="rounded-lg bg-black/[0.035] px-3 py-2.5 text-sm text-muted">
                  {isToday ? "Nothing else available today." : "Nothing to show."}
                </li>
              )}
              {segments.map((seg) =>
                seg.kind === "booked" ? (
                  <li key={seg.booking.id}>
                    <BookedRow booking={seg.booking} showAttendance={date <= today} />
                  </li>
                ) : (
                  <li key={`free-${seg.start}`}>
                    <FreeRow
                      start={seg.start}
                      end={seg.end}
                      bookable={seg.bookable && canBook}
                      onBook={() => openBooking({ date, roomId: room.id, startTime: minToTime(seg.start) })}
                    />
                  </li>
                ),
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function LiveBadge({ occupied, until }: { occupied: boolean; until: string | null }) {
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium", occupied ? "text-danger" : "text-success")}>
      <span className="relative flex size-2">
        <span className={cn("animate-pulse-ring absolute inline-flex h-full w-full rounded-full opacity-75", occupied ? "bg-danger" : "bg-success")} />
        <span className={cn("relative size-2 rounded-full", occupied ? "bg-danger" : "bg-success")} />
      </span>
      {occupied ? `In use until ${until}` : "Available now"}
    </span>
  );
}

function BookedRow({ booking: b, showAttendance }: { booking: BookingSummary; showAttendance: boolean }) {
  const { openDetails } = useOfficeUi();
  const brand = buildFunctionBrand(b.functionColor);
  return (
    <button
      type="button"
      onClick={() => openDetails(b.id)}
      className="group flex w-full items-stretch gap-3 rounded-lg border-l-[3px] px-3 py-2.5 text-left transition-[background-color,transform] hover:brightness-[0.97] active:scale-[0.995]"
      style={{ backgroundColor: brand.tint, borderColor: brand.base }}
      aria-label={`${b.functionLabel}, booked by ${b.ownerName}, ${formatRange(b.startTime, b.endTime)}. View details`}
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-semibold text-ink">{b.functionLabel}</span>
          {b.status === "CHECKED_IN" && (
            <span className="rounded-full bg-success/10 px-1.5 py-px text-[10px] font-semibold text-success">In progress</span>
          )}
        </span>
        <span className="block truncate text-sm text-ink-soft">{b.ownerName}</span>
        {showAttendance && b.attendeeCount > 0 && (
          <span className="mt-0.5 block text-xs text-muted tabular">{b.attendeeCount} checked in</span>
        )}
      </span>
      <span className="shrink-0 self-start text-sm font-medium text-ink tabular">{formatRange(b.startTime, b.endTime)}</span>
    </button>
  );
}

function FreeRow({
  start,
  end,
  bookable,
  onBook,
}: {
  start: number;
  end: number;
  bookable: boolean;
  onBook: () => void;
}) {
  const label = formatRange(minToTime(start), minToTime(end));
  if (!bookable) {
    return (
      <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted">
        <span>Available</span>
        <span className="tabular">{label}</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onBook}
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-dashed border-line-strong px-3 py-2.5 text-left text-sm transition-colors hover:border-brand hover:bg-brand-tint active:scale-[0.995]"
      aria-label={`Available ${label}. Book this time`}
    >
      <span className="font-medium text-success">Available</span>
      <span className="flex items-center gap-2 text-ink-soft tabular">
        {label}
        <span className="flex size-6 items-center justify-center rounded-full bg-black/[0.05] text-ink-soft transition-colors group-hover:bg-brand group-hover:text-white">
          <Plus className="size-3.5" />
        </span>
      </span>
    </button>
  );
}

/** The whole day at a glance: 8 AM–10 PM as a bar, bookings as coloured blocks, a line for "now". */
function DayBar({ bookings, showNow, nowMin }: { bookings: BookingSummary[]; showNow: boolean; nowMin: number }) {
  const pct = (m: number) => ((Math.min(TL_END_MIN, Math.max(TL_START_MIN, m)) - TL_START_MIN) / TOTAL) * 100;
  const nowInRange = showNow && nowMin >= TL_START_MIN && nowMin <= TL_END_MIN;
  return (
    <div className="mt-3" aria-hidden>
      <div className="relative h-7 overflow-hidden rounded-md bg-black/[0.045]">
        {TICKS.slice(1, -1).map((h) => (
          <span key={h} className="absolute top-0 h-full w-px bg-line" style={{ left: `${pct(h * 60)}%` }} />
        ))}
        {bookings.map((b) => {
          const brand = buildFunctionBrand(b.functionColor);
          const l = pct(toMin(b.startTime));
          return (
            <span
              key={b.id}
              className="absolute inset-y-[3px] rounded-[4px] border-l-[3px]"
              style={{
                left: `${l}%`,
                width: `${Math.max(1.5, pct(toMin(b.endTime)) - l)}%`,
                backgroundColor: brand.tint,
                borderColor: brand.base,
              }}
            />
          );
        })}
        {nowInRange && <span className="absolute top-0 h-full w-0.5 bg-brand" style={{ left: `${pct(nowMin)}%` }} />}
      </div>
      <div className="relative mt-1 h-3 text-[10px] text-muted tabular">
        {TICKS.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
            style={{ left: `${pct(h * 60)}%` }}
          >
            {h % 12 === 0 ? 12 : h % 12}
            {h >= 12 && h < 24 ? "p" : "a"}
          </span>
        ))}
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading schedule">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="mt-4 h-7 w-full" />
          <Skeleton className="mt-4 h-12 w-full" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export { FunctionChip };
