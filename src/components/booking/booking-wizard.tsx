"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buildFunctionBrand } from "@/lib/config/function-branding";
import { createBookingAction } from "@/app/actions/booking-actions";
import { getAvailabilityAction } from "@/app/actions/availability-actions";
import type { BookingReferenceBundle, BookedSlot } from "@/lib/types";

const STEPS = ["Role", "Function", "Name", "Room", "Day", "Time", "Confirm"] as const;

export function BookingWizard({ data }: { data: BookingReferenceBundle }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [functionId, setFunctionId] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [ebPassword, setEbPassword] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedRole = data.roles.find((r) => r.id === roleId) ?? null;
  const selectedFunction = data.functions.find((f) => f.id === functionId) ?? null;
  const selectedPerson = data.people.find((p) => p.id === personId) ?? null;
  const selectedRoom = data.rooms.find((r) => r.id === roomId) ?? null;

  // Functions available to the selected role, restricted further to those
  // that actually have at least one person — hides empty combinations.
  const availableFunctions = useMemo(() => {
    if (!roleId) return [];
    const linkedFunctionIds = new Set(
      data.roleFunctionLinks.filter((l) => l.roleId === roleId).map((l) => l.functionId),
    );
    return data.functions.filter(
      (f) =>
        linkedFunctionIds.has(f.id) &&
        data.people.some((p) => p.roleId === roleId && p.functionId === f.id),
    );
  }, [roleId, data]);

  const availablePeople = useMemo(() => {
    if (!roleId || !functionId) return [];
    return data.people.filter((p) => p.roleId === roleId && p.functionId === functionId);
  }, [roleId, functionId, data]);

  const availableRooms = useMemo(() => {
    if (!roleId) return [];
    const allowedRoomIds = new Set(
      data.roomPermissions.filter((p) => p.roleId === roleId).map((p) => p.roomId),
    );
    return data.rooms.filter((r) => allowedRoomIds.has(r.id));
  }, [roleId, data]);

  const brand = buildFunctionBrand(selectedFunction?.color ?? null);

  const durationMinutes = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    return eh * 60 + em - (sh * 60 + sm);
  }, [startTime, endTime]);

  async function loadAvailability(nextRoomId: string, nextDate: string) {
    setLoadingSlots(true);
    try {
      const slots = await getAvailabilityAction(nextRoomId, nextDate);
      setBookedSlots(slots);
    } finally {
      setLoadingSlots(false);
    }
  }

  function goTo(nextStep: number) {
    setError(null);
    setStep(nextStep);
  }

  function canGoNext(): boolean {
    switch (step) {
      case 0:
        return !!roleId;
      case 1:
        return !!functionId;
      case 2:
        return !!personId;
      case 3:
        if (!roomId) return false;
        if (selectedRoom?.requiresPassword) return ebPassword.length > 0;
        return true;
      case 4:
        return !!date;
      case 5:
        return !!startTime && !!endTime && durationMinutes > 0;
      default:
        return true;
    }
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createBookingAction({
        personId,
        roomId,
        date,
        startTime,
        endTime,
        ebRoomPassword: selectedRoom?.requiresPassword ? ebPassword : undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/confirmation/${result.data.bookingId}`);
    });
  }

  return (
    <div>
      <ProgressBar current={step} />

      <Card className="mt-6 p-6">
        {step === 0 && (
          <StepShell title="Choose your role">
            <div className="grid gap-2">
              {data.roles.map((role) => (
                <SelectRow
                  key={role.id}
                  label={role.label}
                  selected={roleId === role.id}
                  onClick={() => {
                    setRoleId(role.id);
                    setFunctionId(null);
                    setPersonId(null);
                    setRoomId(null);
                    goTo(1);
                  }}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell title="Choose your function">
            <div className="grid gap-2">
              {availableFunctions.map((fn) => {
                const fnBrand = buildFunctionBrand(fn.color);
                return (
                  <SelectRow
                    key={fn.id}
                    label={fn.label}
                    selected={functionId === fn.id}
                    accentColor={fnBrand.base}
                    onClick={() => {
                      setFunctionId(fn.id);
                      setPersonId(null);
                      goTo(2);
                    }}
                  />
                );
              })}
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="Choose your name">
            <div className="grid gap-2">
              {availablePeople.map((person) => (
                <SelectRow
                  key={person.id}
                  label={person.name}
                  sublabel={person.position ?? undefined}
                  selected={personId === person.id}
                  accentColor={brand.base}
                  onClick={() => {
                    setPersonId(person.id);
                    goTo(3);
                  }}
                />
              ))}
              {availablePeople.length === 0 && (
                <p className="text-sm text-muted">No one is set up for this function yet.</p>
              )}
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title="Choose a room">
            <div className="grid gap-3">
              {availableRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setRoomId(room.id)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    roomId === room.id ? "border-ink bg-black/[0.03]" : "border-line-strong hover:bg-black/[0.02]",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">{room.name}</span>
                    {room.requiresPassword && <Badge variant="warning">Password required</Badge>}
                  </div>
                  {room.description && <p className="mt-1 text-sm text-muted">{room.description}</p>}
                </button>
              ))}
            </div>

            {selectedRoom?.requiresPassword && (
              <div className="mt-4">
                <Label htmlFor="eb-password">Room password</Label>
                <Input
                  id="eb-password"
                  type="password"
                  className="mt-1.5"
                  value={ebPassword}
                  onChange={(e) => setEbPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
            )}
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title="Choose a day">
            <Input
              type="date"
              value={date}
              min={data.settings.bookingStartDate}
              max={data.settings.bookingEndDate}
              onChange={(e) => {
                setDate(e.target.value);
                if (roomId) void loadAvailability(roomId, e.target.value);
              }}
            />
            <p className="mt-2 text-xs text-muted">
              Bookings are open from {data.settings.bookingStartDate} to {data.settings.bookingEndDate}.
            </p>
          </StepShell>
        )}

        {step === 5 && (
          <StepShell title="Choose a time">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start-time">Start</Label>
                <Input
                  id="start-time"
                  type="time"
                  className="mt-1.5"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-time">End</Label>
                <Input
                  id="end-time"
                  type="time"
                  className="mt-1.5"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {durationMinutes > 0 && (
              <p className="mt-2 text-sm text-muted">
                Duration: {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m
                {(durationMinutes < data.settings.minBookingMinutes ||
                  durationMinutes > data.settings.maxBookingMinutes) && (
                  <span className="text-danger">
                    {" "}
                    — must be between {data.settings.minBookingMinutes} and {data.settings.maxBookingMinutes} minutes.
                  </span>
                )}
              </p>
            )}

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted">Already booked today</p>
              {loadingSlots ? (
                <p className="text-sm text-muted">Loading availability…</p>
              ) : bookedSlots.length === 0 ? (
                <p className="text-sm text-success">This room is fully open today.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {bookedSlots.map((slot, i) => (
                    <Badge key={i} variant="danger">
                      {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </StepShell>
        )}

        {step === 6 && (
          <StepShell title="Confirm your booking">
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-muted">Name</dt>
              <dd className="text-ink font-medium">{selectedPerson?.name}</dd>
              <dt className="text-muted">Role</dt>
              <dd className="text-ink">{selectedRole?.label}</dd>
              <dt className="text-muted">Function</dt>
              <dd>
                <Badge style={{ backgroundColor: brand.tint, color: brand.text }}>{selectedFunction?.label}</Badge>
              </dd>
              <dt className="text-muted">Room</dt>
              <dd className="text-ink">{selectedRoom?.name}</dd>
              <dt className="text-muted">Date</dt>
              <dd className="text-ink tabular">{date}</dd>
              <dt className="text-muted">Time</dt>
              <dd className="text-ink tabular">
                {startTime}–{endTime} ({Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m)
              </dd>
            </dl>

            {error && (
              <div className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</div>
            )}

            <Button className="mt-6 w-full" size="lg" disabled={isPending} onClick={handleSubmit}>
              {isPending ? "Confirming…" : "Confirm booking"}
            </Button>
          </StepShell>
        )}
      </Card>

      <div className="mt-4 flex justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => goTo(step - 1)}>
          Back
        </Button>
        {step < 6 && (
          <Button disabled={!canGoNext()} onClick={() => goTo(step + 1)}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ current }: { current: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted">
        {STEPS.map((label, i) => (
          <span key={label} className={cn(i === current && "font-semibold text-ink")}>
            {label}
          </span>
        ))}
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-black/5">
        <div
          className="h-1 rounded-full bg-ink transition-all"
          style={{ width: `${((current + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

function StepShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 text-base font-semibold text-ink">{title}</h2>
      {children}
    </div>
  );
}

function SelectRow({
  label,
  sublabel,
  selected,
  onClick,
  accentColor,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onClick: () => void;
  accentColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-lg border p-3.5 text-left transition-colors",
        selected ? "border-ink bg-black/[0.03]" : "border-line-strong hover:bg-black/[0.02]",
      )}
      style={selected && accentColor ? { borderColor: accentColor } : undefined}
    >
      <span>
        <span className="font-medium text-ink">{label}</span>
        {sublabel && <span className="ml-2 text-sm text-muted">{sublabel}</span>}
      </span>
      {selected && accentColor && (
        <span className="size-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
      )}
    </button>
  );
}
