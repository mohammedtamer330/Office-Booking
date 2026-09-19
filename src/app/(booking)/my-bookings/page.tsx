export const dynamic = "force-dynamic";

import { nowInAppTz } from "@/lib/time";
import { db } from "@/db";
import { people } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PersonPicker } from "@/components/booking/person-picker";
import { MyBookingsList } from "@/components/booking/my-bookings-list";
import { getPersonBookings } from "@/lib/schedule";

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

  const validPerson = personId && allPeople.some((p) => p.id === personId) ? personId : undefined;
  const personBookings = validPerson ? await getPersonBookings(validPerson) : [];

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <h1 className="text-2xl font-semibold text-ink">My bookings</h1>
      <p className="mt-1 text-sm text-muted">
        Select your name to see the bookings you made and who has checked in to each.
      </p>

      <div className="mt-5">
        <PersonPicker people={allPeople} selectedId={validPerson} />
      </div>

      {validPerson && (
        <div className="mt-6">
          <MyBookingsList bookings={personBookings} personId={validPerson} nowMs={nowInAppTz().getTime()} />
        </div>
      )}
    </div>
  );
}
