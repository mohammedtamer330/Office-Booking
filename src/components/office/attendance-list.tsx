"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { formatInAppTz } from "@/lib/time";
import { cn } from "@/lib/utils";
import { EASE } from "@/components/motion/primitives";
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
      <AnimatePresence initial={false}>
        {attendees.map((a) => (
          <motion.li
            key={a.id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="flex items-center gap-3 overflow-hidden px-3 py-2.5"
          >
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.22, ease: EASE, delay: 0.06 }}
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success"
            >
              <Check className="size-3.5" strokeWidth={3} />
            </motion.span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{a.name}</span>
              <span className="block text-xs text-muted tabular">
                Checked in {formatInAppTz(new Date(a.checkedInAt), "h:mm a")}
              </span>
            </span>
            {a.status === "LATE" && (
              <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">Late</span>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
