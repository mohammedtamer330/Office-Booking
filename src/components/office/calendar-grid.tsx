"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildFunctionBrand } from "@/lib/config/function-branding";
import { formatDayLong, formatMonth, shiftMonth, type MonthDay } from "@/lib/schedule-types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Monthly calendar. Works for any month/year — it derives everything from the
 * `month` string, nothing is hardcoded. Monday-first.
 *
 * Each day can show: coloured dots (which functions are booked), a count, and
 * a soft tint when the day is busy. On phones the cells stay compact (a plain
 * 7-column grid, not a spreadsheet) and the month can be swiped.
 */
export function CalendarGrid({
  month,
  onMonthChange,
  selected,
  today,
  days,
  loading = false,
  onSelect,
  isDisabled,
  isDimmed,
  showToday = true,
}: {
  month: string; // YYYY-MM
  onMonthChange: (month: string) => void;
  selected?: string | null;
  today: string;
  days?: Map<string, MonthDay>;
  loading?: boolean;
  onSelect: (date: string) => void;
  isDisabled?: (date: string) => boolean;
  isDimmed?: (date: string) => boolean;
  showToday?: boolean;
}) {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const currentMonth = today.slice(0, 7);

  return (
    <div
      onTouchStart={(e) => {
        const t = e.touches[0];
        touchStart.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        // A deliberate horizontal swipe, not a scroll.
        if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.6) onMonthChange(shiftMonth(month, dx < 0 ? 1 : -1));
      }}
    >
      <div className="mb-3 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          aria-label="Previous month"
          className="flex size-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-black/[0.05] active:scale-95"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h3 className="flex-1 text-center text-[15px] font-semibold text-ink" aria-live="polite">
          {formatMonth(month)}
        </h3>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          aria-label="Next month"
          className="flex size-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-black/[0.05] active:scale-95"
        >
          <ChevronRight className="size-5" />
        </button>
        {showToday && (
          <button
            type="button"
            onClick={() => {
              if (month !== currentMonth) onMonthChange(currentMonth);
              onSelect(today);
            }}
            className="ml-1 h-10 rounded-lg border border-line-strong px-3 text-[13px] font-medium text-ink transition-colors hover:bg-black/[0.04] active:scale-[0.98]"
          >
            Today
          </button>
        )}
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted" aria-hidden>
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={formatMonth(month)}>
        {cells.map((date, i) => {
          if (!date) return <div key={`b${i}`} aria-hidden />;
          const info = days?.get(date);
          const isSel = selected === date;
          const isTod = date === today;
          const disabled = isDisabled?.(date) ?? false;
          const dimmed = isDimmed?.(date) ?? false;
          const busy = (info?.load ?? 0) >= 0.8 ? "full" : (info?.load ?? 0) >= 0.5 ? "busy" : "none";
          const count = info?.count ?? 0;
          return (
            <button
              key={date}
              type="button"
              role="gridcell"
              disabled={disabled}
              aria-selected={isSel}
              aria-current={isTod ? "date" : undefined}
              aria-label={`${formatDayLong(date)}${count ? `, ${count} booking${count === 1 ? "" : "s"}` : ""}${busy === "full" ? ", nearly full" : busy === "busy" ? ", busy" : ""}`}
              onClick={() => onSelect(date)}
              className={cn(
                "relative flex aspect-square min-h-11 flex-col items-center justify-center gap-[3px] rounded-lg border text-[13px] tabular transition-colors active:scale-95",
                isSel
                  ? "animate-day-pop border-ink bg-ink font-semibold text-white"
                  : cn(
                      "border-transparent text-ink hover:border-line-strong hover:bg-black/[0.04]",
                      busy === "busy" && "bg-warning/10",
                      busy === "full" && "bg-danger/10",
                      isTod && "border-brand font-semibold text-brand",
                    ),
                dimmed && !isSel && "text-muted/50",
                disabled && "pointer-events-none text-muted/35",
              )}
            >
              <span>{Number(date.slice(-2))}</span>
              <span className="flex h-1.5 items-center gap-[3px]" aria-hidden>
                {info?.colors.map((c, idx) => (
                  <span
                    key={idx}
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: isSel ? "#fff" : buildFunctionBrand(c).base }}
                  />
                ))}
              </span>
              {count > 1 && (
                <span className={cn("absolute right-1 top-0.5 hidden text-[10px] font-medium sm:block", isSel ? "text-white/80" : "text-muted")} aria-hidden>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="flex gap-[3px]">
            <span className="size-1.5 rounded-full bg-accent-neutral" />
          </span>
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-warning/10 ring-1 ring-warning/30" /> Busy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-danger/10 ring-1 ring-danger/30" /> Nearly full
        </span>
        {loading && <span className="ml-auto animate-pulse">Updating…</span>}
      </div>
    </div>
  );
}
