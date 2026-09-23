"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkInAction, checkOutAction, cancelBookingAction } from "@/app/actions/booking-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function BookingRowActions({
  bookingId,
  status,
  hasCheckedIn,
}: {
  bookingId: string;
  status: string;
  hasCheckedIn: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.success && result.error) alert(result.error);
      router.refresh();
    });
  }

  if (status === "CANCELLED" || status === "NO_SHOW" || status === "COMPLETED") {
    return <span className="text-xs text-muted">—</span>;
  }

  return (
    <div className="flex gap-2 text-xs">
      {!hasCheckedIn ? (
        <button
          disabled={isPending}
          className="text-ink underline decoration-line-strong transition-colors hover:decoration-ink"
          onClick={() => run(() => checkInAction(bookingId, "ADMIN_MANUAL", "admin"))}
        >
          Check in
        </button>
      ) : (
        <button
          disabled={isPending}
          className="text-ink underline decoration-line-strong transition-colors hover:decoration-ink"
          onClick={() => run(() => checkOutAction(bookingId, "ADMIN_MANUAL", "admin"))}
        >
          Check out
        </button>
      )}
      <button
        disabled={isPending}
        className="text-danger underline decoration-danger/40 transition-colors hover:decoration-danger"
        onClick={() => setConfirmCancel(true)}
      >
        Cancel
      </button>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this booking?"
        description="The room will be freed up and everyone on this booking will show as cancelled."
        confirmLabel="Cancel booking"
        pending={isPending}
        onConfirm={() => {
          run(() => cancelBookingAction(bookingId, "admin", "admin"));
          setConfirmCancel(false);
        }}
      />
    </div>
  );
}
