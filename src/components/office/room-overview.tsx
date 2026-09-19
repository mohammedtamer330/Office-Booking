"use client";

import Link from "next/link";
import { DoorOpen, Lock } from "lucide-react";
import { roomLiveState } from "@/lib/timeline";
import { formatTime12, type DaySchedule } from "@/lib/schedule-types";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/** Every room, live: available or in use right now, and what's next. Links to that room's schedule. */
export function RoomOverview({
  schedule,
  nowMs,
  className,
  tone = "surface",
}: {
  schedule: DaySchedule;
  nowMs: number;
  className?: string;
  tone?: "surface" | "plain";
}) {
  const now = useNow(nowMs, 20_000);
  return (
    <section
      aria-labelledby="rooms-heading"
      className={cn(tone === "surface" && "rounded-2xl border border-line bg-surface p-5", className)}
    >
      <h2 id="rooms-heading" className="text-[15px] font-semibold text-ink">
        Rooms right now
      </h2>
      <ul className="mt-3 divide-y divide-line">
        {schedule.rooms.map((room) => {
          const mine = schedule.bookings.filter((b) => b.roomId === room.id);
          const { current, next } = roomLiveState(mine, now);
          const Icon = room.requiresPassword ? Lock : DoorOpen;
          return (
            <li key={room.id}>
              <Link
                href={`/availability?room=${room.slug}`}
                className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-black/[0.03] active:bg-black/[0.05]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-ink-soft">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">{room.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {current
                      ? `${current.functionLabel} until ${formatTime12(current.endTime)}`
                      : next
                        ? `Next: ${next.functionLabel} at ${formatTime12(next.startTime)}`
                        : "Free for the rest of today"}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-semibold",
                    current ? "text-danger" : "text-success",
                  )}
                >
                  <span className="relative flex size-2">
                    <span
                      className={cn(
                        "animate-pulse-ring absolute inline-flex h-full w-full rounded-full opacity-75",
                        current ? "bg-danger" : "bg-success",
                      )}
                    />
                    <span className={cn("relative size-2 rounded-full", current ? "bg-danger" : "bg-success")} />
                  </span>
                  {current ? "Booked" : "Available"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
