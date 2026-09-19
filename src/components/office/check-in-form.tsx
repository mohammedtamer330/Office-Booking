"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkInAttendeeAction } from "@/app/actions/attendance-actions";
import { getCheckInAvailability, type AttendeeRow, type BookingSummary } from "@/lib/schedule-types";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/**
 * The single check-in form. The booking owner and the attendee are separate
 * things: whoever is standing in the room types THEIR OWN name here.
 */
export function CheckInForm({
  booking,
  attendees,
  suggestions,
  onCheckedIn,
  onDone,
}: {
  booking: BookingSummary;
  attendees: AttendeeRow[];
  suggestions: string[];
  onCheckedIn: () => void;
  onDone: () => void;
}) {
  const now = useNow();
  const availability = getCheckInAvailability(booking, now);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<{ name: string; late: boolean; count: number } | null>(null);

  // Typing suggestions only — people in the owner's function who haven't checked in yet.
  // These are a convenience so names don't get mistyped; they are not an "expected" list.
  const chips = useMemo(() => {
    const done = new Set(attendees.map((a) => a.name.toLowerCase()));
    const q = name.trim().toLowerCase();
    return suggestions
      .filter((s) => !done.has(s.toLowerCase()) && (q === "" || s.toLowerCase().includes(q)) && s.toLowerCase() !== q)
      .slice(0, 6);
  }, [suggestions, attendees, name]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (name.trim().length === 0) {
      setError("Enter your full name to check in.");
      return;
    }
    startTransition(async () => {
      const res = await checkInAttendeeAction({ bookingId: booking.id, name });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSuccess({ name: res.data.attendeeName, late: res.data.late, count: res.data.attendeeCount });
      onCheckedIn();
    });
  }

  if (success) {
    return (
      <div className="flex flex-col items-center py-4 text-center" role="status">
        <svg viewBox="0 0 56 56" className="success-badge size-16" aria-hidden>
          <circle cx="28" cy="28" r="24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" className="success-ring" style={{ transformOrigin: "center", transform: "rotate(-90deg)" }} />
          <path d="M18 29 l7 7 l14 -15" fill="none" stroke="var(--success)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="success-tick" />
        </svg>
        <h3 className="mt-4 text-lg font-semibold text-ink">You&apos;re checked in, {success.name}</h3>
        <p className="mt-1 text-sm text-muted">
          {success.count} {success.count === 1 ? "person has" : "people have"} checked in for {booking.functionLabel}.
        </p>
        {success.late && (
          <p className="mt-2 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
            Recorded as a late arrival.
          </p>
        )}
        <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
          <Button
            variant="secondary"
            size="touch"
            onClick={() => {
              setSuccess(null);
              setName("");
            }}
          >
            Check in someone else
          </Button>
          <Button size="touch" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <Label htmlFor="attendee-name" className="text-sm font-medium text-ink">
        Who&apos;s checking in?
      </Label>
      <Input
        id="attendee-name"
        className="mt-2 h-12 text-base"
        placeholder="Enter your full name"
        autoComplete="name"
        autoCapitalize="words"
        enterKeyHint="done"
        maxLength={80}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (error) setError(null);
        }}
        aria-invalid={!!error}
        aria-describedby={error ? "check-in-error" : undefined}
        disabled={isPending || !availability.open}
      />

      {chips.length > 0 && availability.open && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-muted">Tap your name</p>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setName(c);
                  setError(null);
                }}
                className="min-h-9 rounded-full border border-line-strong px-3 text-sm text-ink transition-colors hover:bg-black/[0.04] active:scale-[0.98]"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p id="check-in-error" role="alert" className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {!availability.open && (
        <p role="status" className="mt-3 rounded-lg bg-black/[0.04] px-3 py-2 text-sm text-ink-soft">
          {availability.message}
        </p>
      )}
      {availability.open && availability.late && (
        <p className="mt-3 text-xs text-warning">The check-in window has passed — you&apos;ll be recorded as late.</p>
      )}

      <Button type="submit" size="touch" className={cn("mt-5 w-full")} disabled={isPending || !availability.open}>
        {isPending ? "Checking in…" : "Check in"}
      </Button>
    </form>
  );
}
