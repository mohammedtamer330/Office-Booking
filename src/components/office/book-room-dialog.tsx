"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, DoorOpen, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EASE } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { CalendarGrid } from "@/components/office/calendar-grid";
import { FunctionChip } from "@/components/office/function-chip";
import { TimeSlotPicker } from "@/components/booking/time-slot-picker";
import { createBookingAction } from "@/app/actions/booking-actions";
import { getDayScheduleAction } from "@/app/actions/schedule-actions";
import { formatDayLong, formatRange, type DaySchedule } from "@/lib/schedule-types";
import { nowMinutesInAppTz, todayInAppTz } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { BookedSlot, BookingReferenceBundle } from "@/lib/types";
import type { CurrentMember } from "@/lib/auth/current-member";

export type BookPrefill = { date?: string; roomId?: string; startTime?: string };

// Identity is no longer picked by hand — it's whoever is signed in. Date →
// Room → Time → Confirm. (There used to be a "Team" step here where you
// picked your role/function/name manually; now that's derived server-side
// from the signed-in Google account — see src/lib/auth/current-member.ts.)
const STEPS = ["Date", "Room", "Time", "Confirm"] as const;
const [S_DATE, S_ROOM, S_TIME, S_CONFIRM] = [0, 1, 2, 3];

export function BookRoomDialog({
  bundle,
  open,
  onOpenChange,
  prefill,
  currentMember,
  onBooked,
}: {
  bundle: BookingReferenceBundle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: BookPrefill;
  /** Who's actually booking — from the signed-in Google session, or null if signed out. */
  currentMember: CurrentMember | null;
  onBooked: (personId: string) => void;
}) {
  // The provider re-keys this component on every open, so state starts fresh from `prefill`.
  const router = useRouter();
  const today = todayInAppTz();
  const minDate = bundle.settings.bookingStartDate < today ? today : bundle.settings.bookingStartDate;
  const maxDate = bundle.settings.bookingEndDate;

  const validPrefillDate = prefill?.date && prefill.date >= minDate && prefill.date <= maxDate ? prefill.date : "";
  const validPrefillRoom = prefill?.roomId && bundle.rooms.some((r) => r.id === prefill.roomId) ? prefill.roomId : null;

  const [step, setStep] = useState(() =>
    validPrefillDate && validPrefillRoom ? S_TIME : validPrefillDate ? S_ROOM : S_DATE,
  );
  const [date, setDate] = useState(validPrefillDate);
  const [month, setMonth] = useState((validPrefillDate || minDate).slice(0, 7));
  const [roomId, setRoomId] = useState<string | null>(validPrefillRoom);
  const [startTime, setStartTime] = useState(validPrefillDate && validPrefillRoom ? (prefill?.startTime ?? "") : "");
  const [endTime, setEndTime] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  // Which way the step content should slide: forward (Continue) or back (Back button).
  const [direction, setDirection] = useState(1);

  // --- The chosen day's bookings (drives room hints and blocked-out times) -------------
  const [sched, setSched] = useState<{ key: string; date: string; data: DaySchedule | null } | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const scheduleKey = date ? `${date}|${reloadTick}` : null;
  useEffect(() => {
    if (!scheduleKey || !date) return;
    let cancelled = false;
    getDayScheduleAction(date).then((res) => {
      if (cancelled) return;
      setSched({ key: scheduleKey, date, data: res.success ? res.data : null });
    });
    return () => {
      cancelled = true;
    };
  }, [scheduleKey, date]);
  const schedule = sched && sched.date === date ? sched.data : null;
  const scheduleState: "idle" | "loading" | "error" = !scheduleKey
    ? "idle"
    : sched?.key === scheduleKey
      ? sched.data
        ? "idle"
        : "error"
      : "loading";

  const room = bundle.rooms.find((r) => r.id === roomId) ?? null;

  // The signed-in member's own record — only used to flag rooms their role
  // can't use (an advisory in the UI; the server independently re-checks
  // this no matter what, same as every other rule here).
  const myPerson = currentMember ? bundle.people.find((p) => p.id === currentMember.personId) ?? null : null;
  const roomPermitted = (r: { id: string }) =>
    !myPerson || bundle.roomPermissions.some((p) => p.roomId === r.id && p.roleId === myPerson.roleId);

  const bookedSlots: BookedSlot[] = useMemo(
    () =>
      (schedule?.bookings ?? [])
        .filter((b) => b.roomId === roomId)
        .map((b) => ({ startTime: b.startTime, endTime: b.endTime, status: b.status })),
    [schedule, roomId],
  );

  const duration = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    return eh * 60 + em - (sh * 60 + sm);
  }, [startTime, endTime]);
  const durationText = duration > 0 ? `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}m` : ""}` : "";

  function go(next: number) {
    setDirection(next >= step ? 1 : -1);
    setError(null);
    setStep(next);
  }

  function canContinue(): boolean {
    if (step === S_DATE) return !!date;
    if (step === S_ROOM) return !!roomId;
    if (step === S_TIME) return !!startTime && !!endTime && duration > 0;
    return true;
  }

  function submit() {
    if (!currentMember) return;
    setError(null);
    startTransition(async () => {
      const res = await createBookingAction({
        personId: currentMember.personId,
        roomId,
        date,
        startTime,
        endTime,
        ebRoomPassword: room?.requiresPassword ? password : undefined,
      });
      if (!res.success) {
        setError({ message: res.error, code: res.code });
        return;
      }
      onBooked(currentMember.personId);
      onOpenChange(false);
      router.push(`/confirmation/${res.data.bookingId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent sheet aria-describedby={undefined} className="pb-0 sm:pb-0">
        <div className="pr-8">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => go(step - 1)}
                aria-label="Back"
                className="-ml-1.5 flex size-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-black/5"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <DialogTitle className="text-lg">Book your room</DialogTitle>
          </div>
          <DialogDescription className="mt-0.5 text-xs">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </DialogDescription>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {STEPS.map((label, i) => (
              <span key={label} className="h-1 flex-1 overflow-hidden rounded-full bg-black/10">
                <motion.span
                  className="block h-full rounded-full bg-brand"
                  initial={false}
                  animate={{ scaleX: i <= step ? 1 : 0 }}
                  style={{ transformOrigin: "left" }}
                  transition={{ duration: 0.3, ease: EASE }}
                />
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 min-h-[280px] overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 28 : -28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -28 : 28 }}
          transition={{ duration: 0.26, ease: EASE }}
        >
          {/* STEP 1 — DATE */}
          {step === S_DATE && (
            <div>
              <h3 className="mb-3 text-[15px] font-semibold text-ink">Which day?</h3>
              <CalendarGrid
                month={month}
                onMonthChange={setMonth}
                selected={date || null}
                today={today}
                isDisabled={(d) => d < minDate || d > maxDate}
                onSelect={(d) => {
                  if (d < minDate || d > maxDate) return;
                  if (d !== date) {
                    setStartTime("");
                    setEndTime("");
                  }
                  setDate(d);
                  setMonth(d.slice(0, 7));
                  go(S_ROOM);
                }}
              />
              <p className="mt-3 text-xs text-muted">
                Bookings are open {formatDayLong(minDate)} to {formatDayLong(maxDate)}.
              </p>
            </div>
          )}

          {/* STEP 2 — ROOM */}
          {step === S_ROOM && (
            <div>
              <h3 className="mb-3 text-[15px] font-semibold text-ink">Which room on {formatDayLong(date)}?</h3>
              {scheduleState === "error" ? (
                <ErrorState
                  message="Something went wrong while loading the schedule."
                  onRetry={() => setReloadTick((n) => n + 1)}
                  className="border-0 px-0"
                />
              ) : (
                <div className="grid gap-2.5">
                  {bundle.rooms.map((r) => {
                    const dayBookings = (schedule?.bookings ?? []).filter((b) => b.roomId === r.id);
                    const Icon = r.requiresPassword ? Lock : DoorOpen;
                    const selected = roomId === r.id;
                    const permitted = roomPermitted(r);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        disabled={!permitted}
                        onClick={() => {
                          if (!permitted) return;
                          if (r.id !== roomId) {
                            setStartTime("");
                            setEndTime("");
                          }
                          setRoomId(r.id);
                          go(S_TIME);
                        }}
                        className={cn(
                          "group flex items-start gap-3 rounded-xl border p-3.5 text-left transition-[colors,transform,box-shadow] duration-200 active:scale-[0.99]",
                          !permitted && "cursor-not-allowed opacity-50",
                          selected
                            ? "border-ink bg-black/[0.03] shadow-[var(--shadow-card)]"
                            : permitted && "border-line-strong hover:-translate-y-0.5 hover:border-line-strong hover:bg-black/[0.02] hover:shadow-[var(--shadow-card)]",
                          !selected && !permitted && "border-line-strong",
                        )}
                      >
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-ink-soft transition-transform duration-200 group-hover:scale-110">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-ink">{r.name}</span>
                          {r.description && <span className="block text-sm text-muted">{r.description}</span>}
                          <span className="mt-1 block text-xs font-medium text-ink-soft">
                            {!permitted ? (
                              <span className="text-muted">Not available for your role</span>
                            ) : scheduleState === "loading" || !schedule ? (
                              <Skeleton className="mt-1 h-3 w-28" />
                            ) : dayBookings.length === 0 ? (
                              <span className="text-success">Free all day</span>
                            ) : (
                              `${dayBookings.length} booking${dayBookings.length === 1 ? "" : "s"} that day`
                            )}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — TIME */}
          {step === S_TIME && room && (
            <div>
              <h3 className="mb-1 text-[15px] font-semibold text-ink">What time?</h3>
              <p className="mb-4 text-sm text-muted">
                {room.name} · {formatDayLong(date)}
              </p>
              {scheduleState === "loading" || (scheduleState === "idle" && !schedule) ? (
                <div className="grid grid-cols-3 gap-1.5 min-[420px]:grid-cols-4 sm:grid-cols-5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : scheduleState === "error" ? (
                <ErrorState
                  message="Something went wrong while loading the schedule."
                  onRetry={() => setReloadTick((n) => n + 1)}
                  className="border-0 px-0"
                />
              ) : (
                <TimeSlotPicker
                  bookedSlots={bookedSlots}
                  startTime={startTime}
                  endTime={endTime}
                  onChangeStart={setStartTime}
                  onChangeEnd={setEndTime}
                  minDurationMinutes={bundle.settings.minBookingMinutes}
                  maxDurationMinutes={bundle.settings.maxBookingMinutes}
                  nowFloorMinutes={date === today ? nowMinutesInAppTz() : undefined}
                />
              )}
              {durationText && (
                <p className="mt-4 text-sm text-ink-soft tabular">
                  {formatRange(startTime, endTime)} · {durationText}
                </p>
              )}
            </div>
          )}

          {/* STEP 4 — CONFIRM */}
          {step === S_CONFIRM && room && (
            <div>
              {!currentMember ? (
                <div className="rounded-xl border border-dashed border-line-strong bg-surface px-5 py-8 text-center">
                  <p className="text-[15px] font-semibold text-ink">Sign in to confirm</p>
                  <p className="mt-1 text-sm text-muted">
                    Sign in with your AIESEC Google account so the booking has an owner.
                  </p>
                  <Button asChild size="touch" className="mt-4">
                    <a href={`/login?callbackUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}>
                      Sign in with Google
                    </a>
                  </Button>
                </div>
              ) : (
                <>
                  <h3 className="mb-3 text-[15px] font-semibold text-ink">Confirm your booking</h3>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 rounded-xl bg-black/[0.035] p-4 text-sm">
                    <dt className="text-muted">Room</dt>
                    <dd className="font-medium text-ink">{room.name}</dd>
                    <dt className="text-muted">Date</dt>
                    <dd className="text-ink">{formatDayLong(date)}</dd>
                    <dt className="text-muted">Time</dt>
                    <dd className="text-ink tabular">
                      {formatRange(startTime, endTime)} <span className="text-muted">({durationText})</span>
                    </dd>
                    <dt className="text-muted">Function</dt>
                    <dd>
                      <FunctionChip label={currentMember.functionLabel} color={currentMember.functionColor} />
                    </dd>
                    <dt className="text-muted">Role</dt>
                    <dd className="text-ink">{currentMember.roleLabel}</dd>
                    <dt className="text-muted">Booked by</dt>
                    <dd className="font-medium text-ink">{currentMember.name}</dd>
                  </dl>

                  {room.requiresPassword && (
                    <div className="mt-4">
                      <Label htmlFor="room-password">Room password</Label>
                      <Input
                        id="room-password"
                        type="password"
                        className="mt-1.5 h-11"
                        placeholder="Enter the room password"
                        autoComplete="off"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError(null);
                        }}
                      />
                    </div>
                  )}

                  {error && (
                    <div role="alert" className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">
                      {error.message}
                      {error.code === "ROOM_CONFLICT" && (
                        <button
                          type="button"
                          className="mt-2 block font-medium underline"
                          onClick={() => {
                            setStartTime("");
                            setEndTime("");
                            setReloadTick((n) => n + 1);
                            go(S_TIME);
                          }}
                        >
                          Pick another time
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </motion.div>
        </AnimatePresence>
        </div>

        {/* Footer — sticky so the action is always reachable on a phone */}
        {step > S_DATE && step !== S_ROOM && (
          <div className="sticky bottom-0 -mx-5 mt-5 border-t border-line bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-6 sm:px-6">
            {step === S_CONFIRM ? (
              currentMember && (
                <Button
                  size="touch"
                  className="w-full"
                  disabled={isPending || (room?.requiresPassword && password.length === 0)}
                  onClick={submit}
                >
                  {isPending ? "Confirming…" : (
                    <>
                      <Check /> Confirm booking
                    </>
                  )}
                </Button>
              )
            ) : (
              <Button size="touch" className="w-full" disabled={!canContinue()} onClick={() => go(step + 1)}>
                Continue
              </Button>
            )}
            {step === S_CONFIRM && currentMember && room?.requiresPassword && password.length === 0 && (
              <p className="mt-2 text-center text-xs text-muted">Enter the room password to confirm.</p>
            )}
          </div>
        )}
        {(step === S_DATE || step === S_ROOM) && <div className="h-4" />}
      </DialogContent>
    </Dialog>
  );
}
