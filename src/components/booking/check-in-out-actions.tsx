"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { checkInAction, checkOutAction } from "@/app/actions/booking-actions";

export function CheckInOutActions({
  bookingId,
  personId,
  status,
  hasCheckedIn,
  hasCheckedOut,
}: {
  bookingId: string;
  personId: string;
  status: string;
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (status === "CANCELLED") {
    return <p className="text-sm text-danger">This booking was cancelled.</p>;
  }
  if (status === "NO_SHOW") {
    return <p className="text-sm text-danger">This booking was marked as a no-show.</p>;
  }
  if (status === "COMPLETED" || hasCheckedOut) {
    return <p className="text-sm text-success">This booking is complete. Thanks!</p>;
  }

  function handleCheckIn() {
    startTransition(async () => {
      const result = await checkInAction(bookingId, "QR", personId);
      if (!result.success) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({
        type: "success",
        text: result.data.late ? "Checked in — note: this was a late check-in." : "Checked in successfully.",
      });
      router.refresh();
    });
  }

  function handleCheckOut() {
    startTransition(async () => {
      const result = await checkOutAction(bookingId, "QR", personId);
      if (!result.success) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: "Checked out. See you next time!" });
      router.refresh();
    });
  }

  return (
    <div>
      {hasCheckedIn && !hasCheckedOut && (
        <div className="mb-3 rounded-lg bg-warning/10 p-3 text-sm text-warning">
          You&apos;re checked in. Come back to this page (or scan the QR again) and tap{" "}
          <strong>Check out</strong> before you leave the room.
        </div>
      )}
      {message && (
        <p className={`mb-3 text-sm ${message.type === "success" ? "text-success" : "text-danger"}`}>
          {message.text}
        </p>
      )}
      {!hasCheckedIn ? (
        <Button className="w-full" disabled={isPending} onClick={handleCheckIn}>
          {isPending ? "Checking in…" : "Check in"}
        </Button>
      ) : (
        <Button className="w-full" disabled={isPending} onClick={handleCheckOut}>
          {isPending ? "Checking out…" : "Check out"}
        </Button>
      )}
    </div>
  );
}
