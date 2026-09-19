"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { checkOutAction } from "@/app/actions/booking-actions";

/**
 * Check-out stays a booking-level action for the booking owner (it ends the
 * booking and frees the room). Checking IN is a per-attendee action and lives
 * in the shared check-in modal — see components/office/check-in-form.tsx.
 */
export function CheckOutAction({
  bookingId,
  ownerId,
  qrToken,
}: {
  bookingId: string;
  ownerId: string;
  qrToken: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleCheckOut() {
    setError(null);
    startTransition(async () => {
      const result = await checkOutAction(bookingId, "QR", ownerId, qrToken);
      if (!result.success) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg bg-black/[0.035] p-4">
      <p className="text-sm font-medium text-ink">Done with the room?</p>
      <p className="mt-0.5 text-sm text-muted">
        Whoever booked it can check the booking out when the team leaves, so the room shows as free again.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      {confirming ? (
        <div className="mt-3 flex gap-2">
          <Button size="touch" disabled={isPending} onClick={handleCheckOut}>
            {isPending ? "Checking out…" : "Yes, check out"}
          </Button>
          <Button size="touch" variant="ghost" disabled={isPending} onClick={() => setConfirming(false)}>
            Not yet
          </Button>
        </div>
      ) : (
        <Button size="touch" variant="secondary" className="mt-3" onClick={() => setConfirming(true)}>
          Check out the booking
        </Button>
      )}
    </div>
  );
}
