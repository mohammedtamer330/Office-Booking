"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, DoorOpen, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { getBookingDetailsAction } from "@/app/actions/attendance-actions";
import { AttendanceList } from "@/components/office/attendance-list";
import { CheckInForm } from "@/components/office/check-in-form";
import { FunctionChip } from "@/components/office/function-chip";
import {
  attendanceLabel,
  formatDayLong,
  formatRange,
  getCheckInAvailability,
  type BookingDetails,
} from "@/lib/schedule-types";
import { useNow } from "@/lib/use-now";

export type BookingDialogState = { bookingId: string; view: "details" | "checkin" } | null;

const STATUS_LABEL: Record<string, { text: string; variant: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  UPCOMING: { text: "Upcoming", variant: "info" },
  CHECKED_IN: { text: "In progress", variant: "success" },
  COMPLETED: { text: "Completed", variant: "neutral" },
  CANCELLED: { text: "Cancelled", variant: "danger" },
  NO_SHOW: { text: "No-show", variant: "warning" },
};

/**
 * One dialog for both "what's this booking?" and "check me in". Every Check in
 * button in the app opens this at the check-in view, so there is exactly one
 * check-in experience to maintain.
 */
export function BookingDialog({
  state,
  onStateChange,
  version,
  myPersonId,
  onChanged,
}: {
  state: BookingDialogState;
  onStateChange: (s: BookingDialogState) => void;
  version: number;
  myPersonId: string | null;
  onChanged: () => void;
}) {
  const bookingId = state?.bookingId ?? null;
  const [result, setResult] = useState<{
    key: string;
    bookingId: string;
    details: BookingDetails | null;
    status: "idle" | "error" | "gone";
  } | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  // `version` bumps whenever something changed elsewhere (a check-in, a new booking), which refetches.
  const key = bookingId ? `${bookingId}|${version}|${retryTick}` : null;

  useEffect(() => {
    if (!key || !bookingId) return;
    let cancelled = false;
    getBookingDetailsAction(bookingId).then((res) => {
      if (cancelled) return;
      if (res.success) setResult({ key, bookingId, details: res.data, status: "idle" });
      else
        setResult({
          key,
          bookingId,
          details: null,
          status: res.code === "BOOKING_NOT_FOUND" ? "gone" : "error",
        });
    });
    return () => {
      cancelled = true;
    };
  }, [key, bookingId]);

  // Keep showing the last details while refreshing (and while the dialog animates closed).
  const details = result && (!bookingId || result.bookingId === bookingId) ? result.details : null;
  const status: "idle" | "loading" | "error" | "gone" = !key ? (result?.status ?? "idle") : result?.key === key ? result.status : "loading";

  const open = state !== null;
  const view = state?.view ?? "details";
  const summary = details?.summary ?? null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onStateChange(null)}>
      <DialogContent sheet aria-describedby={undefined}>
        {status === "loading" && !details && <DetailsSkeleton />}
        {status === "error" && (
          <>
            <DialogTitle className="sr-only-text">Booking</DialogTitle>
            <ErrorState
              message="Something went wrong while loading this booking."
              onRetry={() => setRetryTick((t) => t + 1)}
              className="border-0 px-0 py-6"
            />
          </>
        )}
        {status === "gone" && (
          <>
            <DialogTitle className="sr-only-text">Booking not found</DialogTitle>
            <div className="py-8 text-center">
              <p className="text-sm text-ink-soft">This booking isn&apos;t available any more. It may have been cancelled.</p>
              <Button variant="secondary" size="touch" className="mt-4" onClick={() => onStateChange(null)}>
                Close
              </Button>
            </div>
          </>
        )}

        {summary && details && status !== "gone" && status !== "error" && (
          <>
            {view === "details" ? (
              <DetailsView
                details={details}
                isOwner={!!myPersonId && myPersonId === summary.ownerId}
                onCheckIn={() => onStateChange({ bookingId: summary.id, view: "checkin" })}
              />
            ) : (
              <CheckInView
                details={details}
                onBack={() => onStateChange({ bookingId: summary.id, view: "details" })}
                onCheckedIn={onChanged}
                onDone={() => onStateChange(null)}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading booking">
      <DialogTitle className="sr-only-text">Loading booking</DialogTitle>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-7 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <Skeleton className="mt-6 h-16 w-full" />
      <Skeleton className="mt-4 h-24 w-full" />
    </div>
  );
}

function DetailsView({
  details,
  isOwner,
  onCheckIn,
}: {
  details: BookingDetails;
  isOwner: boolean;
  onCheckIn: () => void;
}) {
  const { summary: s, attendees } = details;
  const now = useNow();
  const availability = getCheckInAvailability(s, now);
  const st = STATUS_LABEL[s.status];
  const Icon = s.roomSlug === "eb-room" ? Lock : DoorOpen;

  return (
    <div>
      <DialogHeader className="pr-8">
        <div className="flex flex-wrap items-center gap-2">
          <FunctionChip label={s.functionLabel} color={s.functionColor} />
          {s.status !== "UPCOMING" && <Badge variant={st.variant}>{st.text}</Badge>}
        </div>
        <DialogTitle className="mt-2 text-xl leading-tight">{s.functionLabel}</DialogTitle>
        <DialogDescription className="mt-1 flex items-center gap-1.5 text-[15px] text-ink-soft">
          <Icon className="size-4 shrink-0 text-muted" /> {s.roomName}
        </DialogDescription>
        <p className="mt-0.5 text-sm text-muted tabular">
          {formatDayLong(s.date)} · {formatRange(s.startTime, s.endTime)}
        </p>
      </DialogHeader>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-lg bg-black/[0.035] p-3.5 text-sm">
        <dt className="text-muted">Booked by</dt>
        <dd className="font-medium text-ink">
          {s.ownerName}
          {s.ownerPosition && <span className="ml-1.5 font-normal text-muted">{s.ownerPosition}</span>}
        </dd>
        <dt className="text-muted">Function</dt>
        <dd className="text-ink">{s.functionLabel}</dd>
        <dt className="text-muted">Role</dt>
        <dd className="text-ink">{s.roleLabel}</dd>
      </dl>

      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-ink">Attendance</h3>
          <span className="text-xs text-muted tabular">{attendanceLabel(attendees.length)}</span>
        </div>
        <AttendanceList attendees={attendees} />
      </div>

      <div className="mt-6 grid gap-2">
        <Button size="touch" className="w-full" onClick={onCheckIn} disabled={!availability.open}>
          Check in
        </Button>
        {!availability.open && <p className="text-center text-xs text-muted">{availability.message}</p>}
        {isOwner && (
          <Button asChild variant="secondary" size="touch" className="w-full">
            <Link href={`/my-bookings?person=${s.ownerId}`}>Manage booking</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function CheckInView({
  details,
  onBack,
  onCheckedIn,
  onDone,
}: {
  details: BookingDetails;
  onBack: () => void;
  onCheckedIn: () => void;
  onDone: () => void;
}) {
  const { summary: s, attendees, suggestions } = details;
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 mb-3 inline-flex min-h-9 items-center gap-1 rounded-md px-1 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Booking details
      </button>
      <DialogHeader className="pr-8">
        <DialogTitle className="text-xl">Check in</DialogTitle>
        <DialogDescription className="sr-only-text">Enter your own name to check in to this booking.</DialogDescription>
      </DialogHeader>

      <div className="mb-5 rounded-lg bg-black/[0.035] p-3.5">
        <p className="font-semibold text-ink">{s.roomName}</p>
        <p className="text-sm text-ink-soft tabular">{formatRange(s.startTime, s.endTime)}</p>
        <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 text-sm">
          <dt className="text-muted">Function</dt>
          <dd className="text-ink">{s.functionLabel}</dd>
          <dt className="text-muted">Booked by</dt>
          <dd className="text-ink">{s.ownerName}</dd>
        </dl>
      </div>

      <CheckInForm
        booking={s}
        attendees={attendees}
        suggestions={suggestions}
        onCheckedIn={onCheckedIn}
        onDone={onDone}
      />
    </div>
  );
}
