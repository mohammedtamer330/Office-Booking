import { DoorOpen, Lock } from "lucide-react";
import { buildFunctionBrand } from "@/lib/config/function-branding";
import type { RoomTimelineEntry } from "@/lib/room-timeline";

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 22;
const TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;
const HOUR_MARKS = [8, 10, 12, 14, 16, 18, 20, 22];

function minutesFromDayStart(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m - DAY_START_HOUR * 60;
}

export function RoomAvailabilityBoard({
  entries,
  compact = false,
}: {
  entries: RoomTimelineEntry[];
  compact?: boolean;
}) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes() - DAY_START_HOUR * 60;
  const nowPercent = (nowMinutes / TOTAL_MINUTES) * 100;
  const showNowLine = nowMinutes >= 0 && nowMinutes <= TOTAL_MINUTES;

  const legend = Array.from(
    new Map(
      entries
        .flatMap((e) => e.bookings)
        .map((b) => [b.functionLabel, b.functionColor] as const),
    ),
  );

  return (
    <div>
      {!compact && legend.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {legend.map(([label, color]) => {
            const brand = buildFunctionBrand(color);
            return (
              <span key={label} className="flex items-center gap-1.5 text-xs text-ink-soft">
                <span className="size-2 rounded-full" style={{ backgroundColor: brand.base }} />
                {label}
              </span>
            );
          })}
        </div>
      )}

      <div className="grid gap-3">
        {entries.map((entry, i) => {
          const occupied = entry.isToday && entry.liveStatus === "Occupied";
          const Icon = entry.room.slug === "eb-room" ? Lock : DoorOpen;
          return (
            <div
              key={entry.room.id}
              className="animate-rise rounded-xl border border-line bg-surface p-4 transition-shadow hover:shadow-[var(--shadow-card)]"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-black/[0.04] text-ink-soft">
                    <Icon className="size-3.5" />
                  </span>
                  <div>
                    <span className="font-medium text-ink">{entry.room.name}</span>
                    {!compact && entry.room.description && (
                      <p className="text-xs text-muted">{entry.room.description}</p>
                    )}
                  </div>
                </div>
                {entry.isToday ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <span className="relative flex size-2">
                      <span
                        className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          occupied ? "bg-danger animate-pulse-ring" : "bg-success animate-pulse-ring"
                        }`}
                      />
                      <span className={`relative size-2 rounded-full ${occupied ? "bg-danger" : "bg-success"}`} />
                    </span>
                    <span className={occupied ? "text-danger" : "text-success"}>
                      {occupied ? "Occupied now" : "Available now"}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-muted">
                    {entry.bookings.length} booking{entry.bookings.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {entry.current && (
                <p className="mt-2 text-xs text-muted">
                  {entry.current.personName} <span className="text-line-strong">·</span> until{" "}
                  <span className="tabular">{entry.current.endTime.slice(0, 5)}</span>
                </p>
              )}
              {!entry.current && entry.next && (
                <p className="mt-2 text-xs text-muted">
                  Next up: {entry.next.personName} at{" "}
                  <span className="tabular">{entry.next.startTime.slice(0, 5)}</span>
                </p>
              )}
              {!entry.current && !entry.next && entry.isToday && (
                <p className="mt-2 text-xs text-success">Nothing else booked for the rest of today.</p>
              )}

              <div className="relative mt-3.5 rounded-lg bg-black/[0.035] p-1.5">
                <div className="relative h-9 overflow-hidden rounded-md">
                  {HOUR_MARKS.slice(1, -1).map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 h-full w-px bg-line"
                      style={{ left: `${((h - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)) * 100}%` }}
                    />
                  ))}

                  {entry.bookings.map((b) => {
                    const brand = buildFunctionBrand(b.functionColor);
                    const left = Math.max(0, (minutesFromDayStart(b.startTime) / TOTAL_MINUTES) * 100);
                    const width = Math.max(
                      1.8,
                      ((minutesFromDayStart(b.endTime) - minutesFromDayStart(b.startTime)) / TOTAL_MINUTES) * 100,
                    );
                    return (
                      <div
                        key={b.id}
                        className="group absolute top-0.5 bottom-0.5 cursor-default"
                        style={{ left: `${left}%`, width: `${width}%` }}
                      >
                        <div
                          className="h-full rounded-[4px] border-l-[3px] transition-transform group-hover:scale-y-105"
                          style={{ backgroundColor: brand.tint, borderColor: brand.base }}
                        />
                        <div className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-white group-hover:block">
                          {b.personName} · {b.startTime.slice(0, 5)}–{b.endTime.slice(0, 5)}
                        </div>
                      </div>
                    );
                  })}

                  {entry.isToday && showNowLine && (
                    <div
                      className="absolute top-0 h-full w-px bg-brand"
                      style={{ left: `${Math.min(100, Math.max(0, nowPercent))}%` }}
                    >
                      <span className="absolute -top-[18px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-1.5 py-[1px] text-[9px] font-medium text-white">
                        now
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-1 flex justify-between px-0.5 text-[10px] text-muted tabular">
                  {HOUR_MARKS.map((h) => (
                    <span key={h}>{h}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
