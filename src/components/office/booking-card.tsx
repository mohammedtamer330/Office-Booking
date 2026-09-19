"use client";

import { ChevronRight, Users } from "lucide-react";
import { CheckInButton } from "@/components/office/booking-buttons";
import { useOfficeUi } from "@/components/office/office-ui-provider";
import { buildFunctionBrand } from "@/lib/config/function-branding";
import { formatRange, type BookingSummary } from "@/lib/schedule-types";
import { cn } from "@/lib/utils";

/**
 * One booking as a card: which room, which function, who booked it, when, and
 * how many people have checked in. The card opens the details modal; the Check
 * in button opens the shared check-in modal — same two entry points everywhere.
 */
export function BookingCard({
  booking: b,
  nowMs,
  dayLabel,
  showAttendance = true,
  showCheckIn = true,
  className,
}: {
  booking: BookingSummary;
  nowMs: number;
  /** e.g. "Tomorrow" — shown above the room name on Upcoming cards. */
  dayLabel?: string;
  showAttendance?: boolean;
  /** Off for bookings on a later day — check-in only makes sense on the day. */
  showCheckIn?: boolean;
  className?: string;
}) {
  const { openDetails } = useOfficeUi();
  const brand = buildFunctionBrand(b.functionColor);
  const inProgress = nowMs >= b.startsAtMs && nowMs < b.endsAtMs;
  const finished = nowMs >= b.endsAtMs || b.status === "COMPLETED";

  return (
    <div
      className={cn(
        "group relative flex items-stretch overflow-hidden rounded-xl border border-line bg-surface transition-[box-shadow,transform] hover:shadow-[var(--shadow-card)]",
        finished && "opacity-70",
        className,
      )}
    >
      <span className="w-1 shrink-0" style={{ backgroundColor: brand.base }} aria-hidden />
      <button
        type="button"
        onClick={() => openDetails(b.id)}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left active:bg-black/[0.02]"
        aria-label={`${b.functionLabel} in ${b.roomName}, ${formatRange(b.startTime, b.endTime)}. View details`}
      >
        <span className="min-w-0 flex-1">
          {dayLabel && <span className="block text-xs font-medium text-brand">{dayLabel}</span>}
          <span className="flex flex-wrap items-center gap-x-2">
            <span className="font-semibold text-ink">{b.roomName}</span>
            {inProgress && (
              <span className="rounded-full bg-success/10 px-1.5 py-px text-[10px] font-semibold text-success">
                In progress
              </span>
            )}
            {finished && (
              <span className="rounded-full bg-black/5 px-1.5 py-px text-[10px] font-semibold text-muted">Finished</span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-sm text-ink-soft">
            {b.functionLabel} · {b.ownerName}
          </span>
          <span className="mt-1 flex items-center gap-3 text-xs text-muted tabular">
            <span className="font-medium text-ink-soft">{formatRange(b.startTime, b.endTime)}</span>
            {showAttendance && (
              <span className="flex items-center gap-1">
                <Users className="size-3.5" aria-hidden />
                {b.attendeeCount === 0 ? "No one checked in yet" : `${b.attendeeCount} checked in`}
              </span>
            )}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
      </button>
      {showCheckIn && (
        <div className="flex items-center pr-3">
          <CheckInButton booking={b} nowMs={nowMs} size="touch" />
        </div>
      )}
    </div>
  );
}
