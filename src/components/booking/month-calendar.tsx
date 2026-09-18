import Link from "next/link";
import { cn } from "@/lib/utils";
import type { MonthDayOverview } from "@/lib/month-overview";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shiftMonth(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function MonthCalendar({
  month,
  today,
  overview,
  roomSlug,
  bookingStartDate,
  bookingEndDate,
}: {
  month: string;
  today: string;
  overview: Map<string, MonthDayOverview>;
  roomSlug?: string;
  bookingStartDate: string;
  bookingEndDate: string;
}) {
  const [year, monthNum] = month.split("-").map(Number);
  const firstOfMonth = new Date(year, monthNum - 1, 1);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const roomParam = roomSlug ? `&room=${roomSlug}` : "";
  const cells: (string | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/availability?month=${shiftMonth(month, -1)}${roomSlug ? `&room=${roomSlug}` : ""}`}
          className="rounded-md px-2 py-1 text-sm text-muted hover:bg-black/[0.04] hover:text-ink"
        >
          ← 
        </Link>
        <h3 className="text-sm font-semibold text-ink">{monthLabel(month)}</h3>
        <Link
          href={`/availability?month=${shiftMonth(month, 1)}${roomSlug ? `&room=${roomSlug}` : ""}`}
          className="rounded-md px-2 py-1 text-sm text-muted hover:bg-black/[0.04] hover:text-ink"
        >
          →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const inRange = date >= bookingStartDate && date <= bookingEndDate;
          const isToday = date === today;
          const day = overview.get(date);
          return (
            <Link
              key={date}
              href={inRange ? `/availability?date=${date}${roomParam}` : "#"}
              aria-disabled={!inRange}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-[13px] transition-colors",
                isToday && "border-brand bg-brand-tint font-semibold text-brand",
                !isToday && inRange && "border-line-strong text-ink hover:bg-black/[0.04]",
                !inRange && "border-transparent text-muted/40 pointer-events-none",
              )}
            >
              <span className="tabular">{Number(date.slice(-2))}</span>
              {day && day.count > 0 && (
                <span className="flex gap-0.5">
                  {day.colors.slice(0, 3).map((c, idx) => (
                    <span key={idx} className="size-1.5 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
