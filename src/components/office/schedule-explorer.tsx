"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarGrid } from "@/components/office/calendar-grid";
import { DayTimeline } from "@/components/office/day-timeline";
import { BookRoomButton } from "@/components/office/booking-buttons";
import { useOfficeUi } from "@/components/office/office-ui-provider";
import { getDayScheduleAction, getMonthDaysAction } from "@/app/actions/schedule-actions";
import { addDays, formatDayLong, relativeDayLabel, type DaySchedule, type MonthDay } from "@/lib/schedule-types";
import { useNow } from "@/lib/use-now";

type Load = "loading" | "error" | "ready";

/**
 * Monthly calendar + the selected day's room timeline. Picking a date never
 * opens a form — it highlights the day and swaps the timeline; booking starts
 * from "Book your room" or by tapping an available slot.
 *
 * Data is fetched per month and per day, never the whole booking table.
 */
export function ScheduleExplorer({
  today,
  nowMs,
  initialDate,
  initialSchedule,
  initialMonthDays,
  minBookingMinutes,
  bookingStartDate,
  bookingEndDate,
  roomSlug,
  heading = "Schedule",
  showBookButton = false,
}: {
  today: string;
  nowMs: number;
  initialDate: string;
  initialSchedule: DaySchedule;
  initialMonthDays: MonthDay[];
  minBookingMinutes: number;
  bookingStartDate: string;
  bookingEndDate: string;
  /** Show only this room (the Room availability page links here per room). */
  roomSlug?: string;
  heading?: string;
  /** Show a "Book your room" button beside the heading (pages without their own hero CTA). */
  showBookButton?: boolean;
}) {
  const { version } = useOfficeUi();
  const now = useNow(nowMs, 30_000);

  const [selected, setSelected] = useState(initialDate);
  const [month, setMonth] = useState(initialDate.slice(0, 7));

  // ---- Month activity (dots, counts, busy tint) ----------------------------------
  // Cached per month; an entry from an older `version` is refetched (a booking or check-in happened).
  const [monthCache, setMonthCache] = useState<Record<string, { version: number; days: MonthDay[] }>>(() => ({
    [initialDate.slice(0, 7)]: { version, days: initialMonthDays },
  }));
  const monthEntry = monthCache[month];
  const monthFresh = monthEntry?.version === version;

  useEffect(() => {
    if (monthFresh) return;
    let cancelled = false;
    getMonthDaysAction(month).then((res) => {
      if (cancelled || !res.success) return; // on failure the calendar just shows no new dots; the timeline still works
      setMonthCache((c) => ({ ...c, [month]: { version, days: res.data } }));
    });
    return () => {
      cancelled = true;
    };
  }, [month, version, monthFresh]);

  const monthLoading = !monthFresh;
  const monthDays = useMemo(() => {
    const map = new Map<string, MonthDay>();
    for (const d of monthEntry?.days ?? []) map.set(d.date, d);
    return map;
  }, [monthEntry]);

  // ---- Selected day's schedule ---------------------------------------------------
  // The server already rendered the initial day; every other day (and every refresh after a
  // change) is fetched. Fetched data for the selected day wins over the server-rendered copy.
  const [mountVersion] = useState(version);
  const [retryTick, setRetryTick] = useState(0);
  const dayKey = `${selected}|${retryTick}|${version}`;
  const serverHasIt = selected === initialDate && retryTick === 0 && version === mountVersion;
  const [dayResult, setDayResult] = useState<{ key: string; date: string; data: DaySchedule | null } | null>(null);

  useEffect(() => {
    if (serverHasIt) return;
    let cancelled = false;
    getDayScheduleAction(selected).then((res) => {
      if (cancelled) return;
      setDayResult({ key: dayKey, date: selected, data: res.success ? res.data : null });
    });
    return () => {
      cancelled = true;
    };
  }, [selected, dayKey, serverHasIt]);

  const schedule: DaySchedule | null =
    dayResult && dayResult.date === selected && dayResult.data
      ? dayResult.data
      : selected === initialDate
        ? initialSchedule
        : null;
  const state: Load = dayResult?.key === dayKey && dayResult.data === null ? "error" : schedule ? "ready" : "loading";

  const visible = useMemo(() => {
    if (!schedule || !roomSlug) return schedule;
    const rooms = schedule.rooms.filter((r) => r.slug === roomSlug);
    const ids = new Set(rooms.map((r) => r.id));
    return { ...schedule, rooms, bookings: schedule.bookings.filter((b) => ids.has(b.roomId)) };
  }, [schedule, roomSlug]);

  // ---- Interaction ---------------------------------------------------------------
  const timelineRef = useRef<HTMLDivElement>(null);
  const select = useCallback((date: string, scroll = true) => {
    setSelected(date);
    setMonth(date.slice(0, 7));
    // On phones the timeline sits below the calendar — bring it into view.
    if (scroll && window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, []);

  const nowMin = useMemo(() => {
    // Cairo wall-clock minutes for "now", from the same instant the timeline uses.
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Cairo",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(now));
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    return h * 60 + m;
  }, [now]);

  const label = relativeDayLabel(selected, today);

  return (
    <section id="schedule" aria-labelledby="schedule-heading" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="schedule-heading" className="text-xl font-semibold text-ink">
            {heading}
          </h2>
          <p className="text-sm text-muted">Pick a day to see every room, hour by hour.</p>
        </div>
        {showBookButton && <BookRoomButton size="touch" className="hidden sm:inline-flex" />}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,340px)_1fr] lg:items-start lg:gap-8">
        <div className="rounded-2xl border border-line bg-surface p-4 lg:sticky lg:top-24">
          <CalendarGrid
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            today={today}
            days={monthDays}
            loading={monthLoading}
            onSelect={(d) => select(d)}
            isDimmed={(d) => d < today}
          />
        </div>

        <div ref={timelineRef} className="scroll-mt-20 min-w-0">
          <div className="mb-3 flex items-center gap-1">
            <button
              type="button"
              onClick={() => select(addDays(selected, -1), false)}
              aria-label="Previous day"
              className="flex size-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-black/[0.05] active:scale-95"
            >
              <ChevronLeft className="size-5" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-[15px] font-semibold text-ink">{formatDayLong(selected)}</p>
              {(label === "Today" || label === "Tomorrow") && <p className="text-xs text-muted">{label}</p>}
            </div>
            <button
              type="button"
              onClick={() => select(addDays(selected, 1), false)}
              aria-label="Next day"
              className="flex size-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-black/[0.05] active:scale-95"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          <DayTimeline
            date={selected}
            today={today}
            schedule={visible}
            state={state}
            onRetry={() => setRetryTick((t) => t + 1)}
            nowMs={now}
            nowMin={nowMin}
            minBookingMinutes={minBookingMinutes}
            bookingStartDate={bookingStartDate}
            bookingEndDate={bookingEndDate}
          />
        </div>
      </div>
    </section>
  );
}
