export const dynamic = "force-dynamic";

import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { combineDateAndTimeInAppTz, nowInAppTz } from "@/lib/time";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckInOutActions } from "@/components/booking/check-in-out-actions";

export default async function CheckInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.qrToken, token),
    with: { person: true, room: true },
  });

  if (!booking) notFound();

  const settings = await getSettings();
  const startAt = combineDateAndTimeInAppTz(booking.date, booking.startTime);
  const windowStart = new Date(startAt.getTime() - settings.checkInWindowBeforeMinutes * 60000);
  const windowEnd = new Date(startAt.getTime() + settings.checkInWindowAfterMinutes * 60000);
  const now = nowInAppTz();
  const withinWindow = now >= windowStart && now <= windowEnd;

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <h1 className="text-xl font-semibold text-ink">Booking check-in</h1>

      <Card className="mt-5 p-6">
        <div className="flex items-center justify-between">
          <span className="font-medium text-ink">{booking.person.name}</span>
          <Badge variant="info">{booking.status.replace("_", " ")}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">{booking.room.name}</p>
        <p className="mt-1 text-sm text-muted tabular">
          {booking.date} · {booking.startTime.slice(0, 5)}–{booking.endTime.slice(0, 5)}
        </p>
        <p className="mt-1 text-xs text-muted tabular">{booking.bookingCode}</p>

        {!withinWindow && booking.status === "UPCOMING" && (
          <p className="mt-3 text-sm text-warning">
            Check-in opens {settings.checkInWindowBeforeMinutes} min before the start time.
          </p>
        )}

        <div className="mt-5">
          <CheckInOutActions
            bookingId={booking.id}
            personId={booking.personId}
            status={booking.status}
            hasCheckedIn={!!booking.actualCheckInAt}
            hasCheckedOut={!!booking.actualCheckOutAt}
          />
        </div>
      </Card>
    </div>
  );
}
