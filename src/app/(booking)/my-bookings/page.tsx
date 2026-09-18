export const dynamic = "force-dynamic";

import { db } from "@/db";
import { bookings, people } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { PersonPicker } from "@/components/booking/person-picker";
import { MyBookingsList } from "@/components/booking/my-bookings-list";

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string }>;
}) {
  const { person: personId } = await searchParams;

  const allPeople = await db.query.people.findMany({
    where: eq(people.active, true),
    orderBy: (t, { asc }) => asc(t.name),
  });

  const personBookings = personId
    ? await db.query.bookings.findMany({
        where: eq(bookings.personId, personId),
        with: { room: true },
        orderBy: [desc(bookings.date), desc(bookings.startTime)],
      })
    : [];

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <h1 className="text-2xl font-semibold text-ink">My bookings</h1>
      <p className="mt-1 text-sm text-muted">Select your name to see your booking history.</p>

      <div className="mt-5">
        <PersonPicker people={allPeople} selectedId={personId} />
      </div>

      {personId && (
        <div className="mt-6">
          <MyBookingsList bookings={personBookings} personId={personId} />
        </div>
      )}
    </div>
  );
}
