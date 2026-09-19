"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useOfficeUi } from "@/components/office/office-ui-provider";
import { formatTime12, getCheckInAvailability, type BookingSummary } from "@/lib/schedule-types";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/** "Book your room" — the one booking entry point, wherever it appears. */
export function BookRoomButton({
  children = "Book your room",
  ...props
}: ButtonProps & { children?: React.ReactNode }) {
  const { openBooking, canBook } = useOfficeUi();
  return (
    <Button onClick={() => openBooking()} disabled={!canBook} {...props}>
      {children}
    </Button>
  );
}

/**
 * Check in. Opens the shared check-in modal; the button itself just reflects
 * whether the window is open (the server still decides).
 */
export function CheckInButton({
  booking,
  nowMs,
  className,
  size = "sm",
  variant = "primary",
}: {
  booking: BookingSummary;
  /** Server-rendered "now", so the first paint matches what the browser will show. */
  nowMs?: number;
  className?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}) {
  const { openCheckIn } = useOfficeUi();
  const now = useNow(nowMs, 15_000);
  const availability = getCheckInAvailability(booking, now);
  if (!availability.open && (availability.reason === "closed" || availability.reason === "ended")) return null;
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn(className)}
      disabled={!availability.open}
      title={availability.open ? undefined : availability.message}
      onClick={(e) => {
        e.stopPropagation();
        openCheckIn(booking.id);
      }}
    >
      {availability.open || availability.reason !== "not_yet" ? "Check in" : `Opens ${formatTime12(booking.opensAtLabel)}`}
    </Button>
  );
}
