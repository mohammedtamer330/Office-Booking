export const dynamic = "force-dynamic";

import { getBookingReferenceData } from "@/lib/reference-data";
import { BookingWizard } from "@/components/booking/booking-wizard";
import type { BookingReferenceBundle } from "@/lib/types";

export default async function BookingHomePage() {
  const data = await getBookingReferenceData();

  if (!data.settings) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center text-muted">
        The system hasn&apos;t been configured yet. Run <code>npm run db:seed</code> to get started.
      </div>
    );
  }

  // Never send the EB Room password hash to the client.
  const bundle: BookingReferenceBundle = {
    people: data.people,
    roles: data.roles as BookingReferenceBundle["roles"],
    functions: data.functions,
    rooms: data.rooms,
    roleFunctionLinks: data.roleFunctionLinks,
    roomPermissions: data.roomPermissions,
    settings: {
      bookingStartDate: data.settings.bookingStartDate,
      bookingEndDate: data.settings.bookingEndDate,
      minBookingMinutes: data.settings.minBookingMinutes,
      maxBookingMinutes: data.settings.maxBookingMinutes,
      checkInWindowBeforeMinutes: data.settings.checkInWindowBeforeMinutes,
      checkInWindowAfterMinutes: data.settings.checkInWindowAfterMinutes,
      lateCheckInPolicy: data.settings.lateCheckInPolicy as BookingReferenceBundle["settings"]["lateCheckInPolicy"],
      noShowGraceMinutes: data.settings.noShowGraceMinutes,
      cancellationCutoffMinutes: data.settings.cancellationCutoffMinutes,
    },
  };

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Book a room</h1>
        <p className="mt-1 text-sm text-muted">
          Select your role, function, and name — then pick a room and time.
        </p>
      </div>
      <BookingWizard data={bundle} />
    </div>
  );
}
