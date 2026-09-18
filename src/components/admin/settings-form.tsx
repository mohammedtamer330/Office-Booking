"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateSettingsAction } from "@/app/actions/admin-actions";

type Settings = {
  bookingStartDate: string;
  bookingEndDate: string;
  minBookingMinutes: number;
  maxBookingMinutes: number;
  checkInWindowBeforeMinutes: number;
  checkInWindowAfterMinutes: number;
  lateCheckInPolicy: string;
  noShowGraceMinutes: number;
  cancellationCutoffMinutes: number;
};

export function SettingsForm({ settings }: { settings: Settings }) {
  const [form, setForm] = useState(settings);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await updateSettingsAction(form);
      setMessage(
        result.success
          ? { type: "success", text: "Settings saved." }
          : { type: "error", text: result.error },
      );
    });
  }

  function num(key: keyof Settings) {
    return {
      value: form[key] as number,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: parseInt(e.target.value, 10) || 0 })),
    };
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Booking period start</Label>
          <Input
            type="date"
            className="mt-1.5"
            value={form.bookingStartDate}
            onChange={(e) => setForm((f) => ({ ...f, bookingStartDate: e.target.value }))}
          />
        </div>
        <div>
          <Label>Booking period end</Label>
          <Input
            type="date"
            className="mt-1.5"
            value={form.bookingEndDate}
            onChange={(e) => setForm((f) => ({ ...f, bookingEndDate: e.target.value }))}
          />
        </div>
        <div>
          <Label>Min duration (minutes)</Label>
          <Input type="number" className="mt-1.5" {...num("minBookingMinutes")} />
        </div>
        <div>
          <Label>Max duration (minutes)</Label>
          <Input type="number" className="mt-1.5" {...num("maxBookingMinutes")} />
        </div>
        <div>
          <Label>Check-in window before (min)</Label>
          <Input type="number" className="mt-1.5" {...num("checkInWindowBeforeMinutes")} />
        </div>
        <div>
          <Label>Check-in window after (min)</Label>
          <Input type="number" className="mt-1.5" {...num("checkInWindowAfterMinutes")} />
        </div>
        <div>
          <Label>No-show grace (min)</Label>
          <Input type="number" className="mt-1.5" {...num("noShowGraceMinutes")} />
        </div>
        <div>
          <Label>Cancellation cutoff (min)</Label>
          <Input type="number" className="mt-1.5" {...num("cancellationCutoffMinutes")} />
        </div>
        <div className="col-span-2">
          <Label>Late check-in policy</Label>
          <select
            className="mt-1.5 h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm"
            value={form.lateCheckInPolicy}
            onChange={(e) => setForm((f) => ({ ...f, lateCheckInPolicy: e.target.value }))}
          >
            <option value="ALLOW">Allow</option>
            <option value="BLOCK">Block</option>
            <option value="ALLOW_WITH_WARNING">Allow with warning</option>
          </select>
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-success" : "text-danger"}`}>{message.text}</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
