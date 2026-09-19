export const dynamic = "force-dynamic";

import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getQrForBookingAction } from "@/app/actions/booking-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildFunctionBrand } from "@/lib/config/function-branding";
import Link from "next/link";
import Image from "next/image";
import { formatDayLong, formatRange } from "@/lib/schedule-types";

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { person: { with: { role: true, function: true } }, room: true },
  });

  if (!booking) notFound();

  const { dataUrl } = await getQrForBookingAction(booking.id, booking.qrToken);
  const brand = buildFunctionBrand(booking.person.function.color);

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <div className="text-center">
        <Badge variant="success" className="mb-3">
          Booking Confirmed
        </Badge>
        <h1 className="text-2xl font-semibold text-ink tabular">{booking.bookingCode}</h1>
      </div>

      <Card className="mt-6 p-6">
        <div className="flex justify-center">
          <Image src={dataUrl} alt="Booking QR code" width={220} height={220} unoptimized />
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Show this to your team. Everyone who comes checks in with their own name.
        </p>
        <p className="mt-1 text-center text-xs text-muted">
          When you leave, the person who booked can end the booking from the check-in page.
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-muted">Booked by</dt>
          <dd className="font-medium text-ink">{booking.person.name}</dd>
          <dt className="text-muted">Function</dt>
          <dd>
            <Badge style={{ backgroundColor: brand.tint, color: brand.text }}>
              {booking.person.function.label}
            </Badge>
          </dd>
          <dt className="text-muted">Room</dt>
          <dd className="text-ink">{booking.room.name}</dd>
          <dt className="text-muted">Date</dt>
          <dd className="text-ink tabular">{formatDayLong(booking.date)}</dd>
          <dt className="text-muted">Time</dt>
          <dd className="text-ink tabular">
            {formatRange(booking.startTime.slice(0, 5), booking.endTime.slice(0, 5))}
          </dd>
          <dt className="text-muted">Status</dt>
          <dd>
            <Badge variant="info">{booking.status.replace("_", " ")}</Badge>
          </dd>
        </dl>
      </Card>

      <div className="mt-6 flex gap-3">
        <Button asChild variant="secondary" className="flex-1">
          <Link href="/my-bookings">My bookings</Link>
        </Button>
        <Button asChild className="flex-1">
          <Link href={`/check-in/${booking.qrToken}`}>Open check-in page</Link>
        </Button>
      </div>
    </div>
  );
}
