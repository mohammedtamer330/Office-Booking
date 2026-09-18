"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkInAction, checkOutAction, cancelBookingAction } from "@/app/actions/booking-actions";

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
          className="text-ink underline decoration-line-strong hover:decoration-ink"
          onClick={() => run(() => checkInAction(bookingId, "ADMIN_MANUAL", "admin"))}
        >
          Check in
        </button>
      ) : (
        <button
          disabled={isPending}
          className="text-ink underline decoration-line-strong hover:decoration-ink"
          onClick={() => run(() => checkOutAction(bookingId, "ADMIN_MANUAL", "admin"))}
        >
          Check out
        </button>
      )}
      <button
        disabled={isPending}
        className="text-danger underline decoration-danger/40 hover:decoration-danger"
        onClick={() => {
          if (confirm("Cancel this booking?")) run(() => cancelBookingAction(bookingId, "admin", "admin"));
        }}
      >
        Cancel
      </button>
    </div>
  );
}
