import { Check } from "lucide-react";
import { formatInAppTz } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AttendeeRow } from "@/lib/schedule-types";

/** "Ahmed Ali — Checked in 6:57 PM". Shows only people who actually checked in; there is no expected roster. */
export function AttendanceList({
  attendees,
  emptyText = "No one has checked in yet.",
  className,
}: {
  attendees: AttendeeRow[];
  emptyText?: string;
  className?: string;
}) {
  if (attendees.length === 0) {
    return <p className={cn("rounded-lg bg-black/[0.035] px-3 py-3 text-sm text-muted", className)}>{emptyText}</p>;
  }
  return (
    <ul className={cn("divide-y divide-line rounded-lg border border-line", className)}>
      {attendees.map((a) => (
        <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{a.name}</span>
            <span className="block text-xs text-muted tabular">
              Checked in {formatInAppTz(new Date(a.checkedInAt), "h:mm a")}
            </span>
          </span>
          {a.status === "LATE" && (
            <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">Late</span>
          )}
        </li>
      ))}
    </ul>
  );
}
