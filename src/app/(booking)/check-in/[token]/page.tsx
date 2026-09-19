export const dynamic = "force-dynamic";

import { nowInAppTz } from "@/lib/time";
import { notFound } from "next/navigation";
import { getBookingByQrToken } from "@/lib/schedule";
import { getAttendeesByBooking } from "@/lib/booking/attendance";
import { AttendanceList } from "@/components/office/attendance-list";
import { CheckInButton } from "@/components/office/booking-buttons";
import { CheckOutAction } from "@/components/booking/check-in-out-actions";
import { FunctionChip } from "@/components/office/function-chip";
import { Badge } from "@/components/ui/badge";
import { formatDayLong, formatRange } from "@/lib/schedule-types";

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: "Upcoming",
  CHECKED_IN: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

/**
 * Landing page for the booking's QR code. Anyone in the room can open it and
 * check in with their own name; the owner (who holds this private link) can
 * also end the booking when the team leaves.
 */
export default async function QrCheckInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await getBookingByQrToken(token);
  if (!found) notFound();

  const { summary: b, bookingCode, actualCheckOutAt } = found;
  const attendees = (await getAttendeesByBooking([b.id])).get(b.id) ?? [];
  const nowMs = nowInAppTz().getTime();

  const closed = b.status === "CANCELLED" || b.status === "NO_SHOW" || b.status === "COMPLETED";
  const canEnd = b.status === "CHECKED_IN" && !actualCheckOutAt;

  return (
    <div className="mx-auto max-w-md px-5 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold text-ink">Check in</h1>
      <p className="mt-1 text-sm text-muted">Each person checks in with their own name.</p>

      <section className="mt-5 rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-ink">{b.roomName}</p>
            <p className="mt-0.5 text-sm text-ink-soft tabular">
              {formatDayLong(b.date)} · {formatRange(b.startTime, b.endTime)}
            </p>
          </div>
          <Badge variant={b.status === "CHECKED_IN" ? "success" : closed ? "neutral" : "info"}>
            {STATUS_LABEL[b.status] ?? b.status}
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
          <FunctionChip label={b.functionLabel} color={b.functionColor} />
          <span>Booked by {b.ownerName}</span>
        </div>
        <p className="mt-2 text-xs text-muted tabular">{bookingCode}</p>

        {!closed && (
          <div className="mt-5">
            <CheckInButton booking={b} nowMs={nowMs} size="touch" className="w-full" />
          </div>
        )}
        {b.status === "CANCELLED" && <p className="mt-4 text-sm text-danger">This booking was cancelled.</p>}
        {b.status === "NO_SHOW" && <p className="mt-4 text-sm text-danger">This booking was marked as a no-show.</p>}
        {b.status === "COMPLETED" && <p className="mt-4 text-sm text-success">This booking is complete. Thanks!</p>}
      </section>

      <section className="mt-6" aria-labelledby="attendance-heading">
        <div className="flex items-baseline justify-between">
          <h2 id="attendance-heading" className="text-[15px] font-semibold text-ink">
            Who&apos;s here
          </h2>
          <span className="text-sm text-muted tabular">{attendees.length} checked in</span>
        </div>
        <AttendanceList attendees={attendees} className="mt-2.5" />
      </section>

      {canEnd && (
        <div className="mt-6">
          <CheckOutAction bookingId={b.id} ownerId={b.ownerId} qrToken={token} />
        </div>
      )}
    </div>
  );
}
