import { getBookingReferenceData } from "@/lib/reference-data";
import type { BookingReferenceBundle } from "@/lib/types";

/**
 * The reference data the booking flow needs in the browser (people, roles,
 * functions, rooms, permission tables, settings). Returns null when the app
 * hasn't been seeded yet.
 */
export async function getBookingBundle(): Promise<BookingReferenceBundle | null> {
  const data = await getBookingReferenceData();
  if (!data.settings) return null;
  return {
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
}
