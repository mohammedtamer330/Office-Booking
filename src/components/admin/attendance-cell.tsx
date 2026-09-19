"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getAttendanceForAdminAction, removeAttendeeAction } from "@/app/actions/attendance-actions";
import { formatInAppTz } from "@/lib/time";
import type { AttendeeRow } from "@/lib/schedule-types";

/** "3 people" in the bookings table; opens the attendance list, where an admin can remove a mistaken entry. */
export function AttendanceCell({
  bookingId,
  count,
  label,
}: {
  bookingId: string;
  count: number;
  /** e.g. "Ahmed · Room 2, 6:00 PM" — names the dialog for screen readers. */
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AttendeeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    setError(null);
    getAttendanceForAdminAction(bookingId).then((res) => {
      if (res.success) setRows(res.data);
      else setError(res.error);
    });
  }

  function remove(a: AttendeeRow) {
    if (!confirm(`Remove ${a.name} from this booking's attendance?`)) return;
    startTransition(async () => {
      const res = await removeAttendeeAction(a.id);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setRows((r) => r?.filter((x) => x.id !== a.id) ?? null);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setRows(null);
          setOpen(true);
          load();
        }}
        className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-ink-soft transition-colors hover:bg-black/[0.05] hover:text-ink"
        aria-label={`${count} checked in for ${label}. View attendance`}
      >
        <Users className="size-3.5" aria-hidden />
        <span className="tabular">{count}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent sheet>
          <DialogHeader>
            <DialogTitle>Attendance</DialogTitle>
            <DialogDescription>{label}</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {error && (
              <p role="alert" className="mb-3 text-sm text-danger">
                {error}
              </p>
            )}
            {rows === null && !error ? (
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : rows && rows.length === 0 ? (
              <p className="rounded-lg bg-black/[0.035] px-3 py-3 text-sm text-muted">No one has checked in.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {rows?.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {a.name}
                        {a.status === "LATE" && (
                          <span className="ml-2 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                            Late
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-muted tabular">
                        {formatInAppTz(new Date(a.checkedInAt), "h:mm a")}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(a)}
                      className="text-xs text-danger underline decoration-danger/40 hover:decoration-danger disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
