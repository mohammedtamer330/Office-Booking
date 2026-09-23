"use client";

import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion/primitives";
import type { BookedSlot } from "@/lib/types";
import { formatTime12 } from "@/lib/schedule-types";

const STEP_MINUTES = 30;
const DAY_START_MIN = 8 * 60;
const DAY_END_MIN = 22 * 60;

function toMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function generateSlots(): number[] {
  const slots: number[] = [];
  for (let m = DAY_START_MIN; m <= DAY_END_MIN; m += STEP_MINUTES) slots.push(m);
  return slots;
}

/** The next booking's start, in minutes, that begins after `afterMinutes` — or the day end if none. */
function ceilingAfter(afterMinutes: number, booked: BookedSlot[]): number {
  const starts = booked.map((b) => toMinutes(b.startTime)).filter((s) => s > afterMinutes);
  return starts.length > 0 ? Math.min(...starts) : DAY_END_MIN;
}

function isWithinBooking(minutes: number, booked: BookedSlot[]): boolean {
  return booked.some((b) => minutes >= toMinutes(b.startTime) && minutes < toMinutes(b.endTime));
}

export function TimeSlotPicker({
  bookedSlots,
  startTime,
  endTime,
  onChangeStart,
  onChangeEnd,
  minDurationMinutes,
  maxDurationMinutes,
  nowFloorMinutes,
}: {
  bookedSlots: BookedSlot[];
  startTime: string;
  endTime: string;
  onChangeStart: (time: string) => void;
  onChangeEnd: (time: string) => void;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  /** If the selected day is today, pass the current minute-of-day so past slots are disabled. Otherwise omit. */
  nowFloorMinutes?: number;
}) {
  const slots = generateSlots();
  const startMinutes = startTime ? toMinutes(startTime) : null;

  const endCeiling = startMinutes !== null ? ceilingAfter(startMinutes, bookedSlots) : null;
  const endMinAllowed = startMinutes !== null ? startMinutes + minDurationMinutes : null;
  const endMaxAllowed =
    startMinutes !== null ? Math.min(startMinutes + maxDurationMinutes, endCeiling ?? DAY_END_MIN) : null;

  return (
    <div>
      <div>
        <p className="mb-2 text-xs font-medium text-muted">Start time</p>
        <div className="grid grid-cols-3 gap-1.5 min-[420px]:grid-cols-4 sm:grid-cols-5">
          {slots.slice(0, -1).map((m) => {
            const booked = isWithinBooking(m, bookedSlots);
            const past = nowFloorMinutes !== undefined && m < nowFloorMinutes;
            const disabled = booked || past;
            const selected = startMinutes === m;
            return (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChangeStart(toTimeString(m));
                  onChangeEnd(""); // force re-pick of end time against the new ceiling
                }}
                className={cn(
                  "min-h-10 rounded-md border px-1.5 py-1.5 text-[13px] tabular transition-[colors,transform] duration-150 active:scale-[0.98]",
                  selected && "animate-day-pop border-ink bg-ink text-white",
                  !selected && !disabled && "border-line-strong text-ink hover:-translate-y-px hover:bg-black/[0.04]",
                  disabled && "cursor-not-allowed border-line bg-black/[0.03] text-muted/60 line-through",
                )}
                title={booked ? "Already booked" : past ? "In the past" : undefined}
              >
                {formatTime12(toTimeString(m))}
              </button>
            );
          })}
        </div>
      </div>

      {startMinutes !== null && (
        <FadeIn className="mt-4">
          <p className="mb-2 text-xs font-medium text-muted">
            End time
            {endCeiling !== null && endCeiling < DAY_END_MIN && (
              <span className="ml-1 text-muted/70">(next booking starts at {formatTime12(toTimeString(endCeiling))})</span>
            )}
          </p>
          <div className="grid grid-cols-3 gap-1.5 min-[420px]:grid-cols-4 sm:grid-cols-5">
            {slots
              .filter((m) => m > startMinutes)
              .map((m) => {
                const tooSoon = endMinAllowed !== null && m < endMinAllowed;
                const tooLate = endMaxAllowed !== null && m > endMaxAllowed;
                const disabled = tooSoon || tooLate;
                const selected = endTime && toMinutes(endTime) === m;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChangeEnd(toTimeString(m))}
                    className={cn(
                      "min-h-10 rounded-md border px-1.5 py-1.5 text-[13px] tabular transition-[colors,transform] duration-150 active:scale-[0.98]",
                      selected && "animate-day-pop border-brand bg-brand text-white",
                      !selected && !disabled && "border-line-strong text-ink hover:-translate-y-px hover:bg-black/[0.04]",
                      disabled && "cursor-not-allowed border-line bg-black/[0.03] text-muted/60 line-through",
                    )}
                    title={tooSoon ? `Minimum booking is ${minDurationMinutes} min` : tooLate ? "Past the allowed limit" : undefined}
                  >
                    {formatTime12(toTimeString(m))}
                  </button>
                );
              })}
          </div>
        </FadeIn>
      )}
    </div>
  );
}
