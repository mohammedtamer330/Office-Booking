"use server";

import { revalidatePath } from "next/cache";
import { BookingError } from "@/lib/booking/engine";
import { checkInAttendee, getAttendeesByBooking, removeAttendee } from "@/lib/booking/attendance";
import { attendeeCheckInSchema } from "@/lib/validation/schemas";
import { getBookingDetails } from "@/lib/schedule";
import { isAdmin, ADMIN_REQUIRED_MESSAGE } from "@/lib/auth/require-admin";
import type { ActionResult } from "@/lib/action-result";
import type { AttendeeRow, BookingDetails } from "@/lib/schedule-types";
import { z } from "zod";

/**
 * The one check-in entry point. The homepage cards, the timeline, the booking
 * modal, My bookings and the QR page all call exactly this.
 */
export async function checkInAttendeeAction(
  rawInput: unknown,
): Promise<ActionResult<{ attendeeName: string; late: boolean; firstArrival: boolean; attendeeCount: number }>> {
  const parsed = attendeeCheckInSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request.", code: "INVALID" };
  }
  try {
    const result = await checkInAttendee({ bookingId: parsed.data.bookingId, name: parsed.data.name });
    revalidatePath("/");
    revalidatePath("/my-bookings");
    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    return {
      success: true,
      data: {
        attendeeName: result.attendee.name,
        late: result.late,
        firstArrival: result.firstArrival,
        attendeeCount: result.attendeeCount,
      },
    };
  } catch (err) {
    if (err instanceof BookingError) return { success: false, error: err.message, code: err.code };
    console.error("checkInAttendeeAction failed", err);
    return { success: false, error: "Something went wrong while checking you in. Please try again." };
  }
}

const idSchema = z.string().uuid();

export async function getBookingDetailsAction(bookingId: unknown): Promise<ActionResult<BookingDetails>> {
  const parsed = idSchema.safeParse(bookingId);
  if (!parsed.success) return { success: false, error: "We couldn't find that booking.", code: "INVALID" };
  try {
    const details = await getBookingDetails(parsed.data);
    if (!details) return { success: false, error: "We couldn't find that booking.", code: "BOOKING_NOT_FOUND" };
    return { success: true, data: details };
  } catch (err) {
    console.error("getBookingDetailsAction failed", err);
    return { success: false, error: "Something went wrong while loading this booking." };
  }
}

// --- Admin-only ------------------------------------------------------------

export async function getAttendanceForAdminAction(bookingId: unknown): Promise<ActionResult<AttendeeRow[]>> {
  if (!(await isAdmin())) return { success: false, error: ADMIN_REQUIRED_MESSAGE, code: "UNAUTHORIZED" };
  const parsed = idSchema.safeParse(bookingId);
  if (!parsed.success) return { success: false, error: "Invalid booking." };
  const map = await getAttendeesByBooking([parsed.data]);
  return { success: true, data: map.get(parsed.data) ?? [] };
}

export async function removeAttendeeAction(attendeeId: unknown): Promise<ActionResult<null>> {
  if (!(await isAdmin())) return { success: false, error: ADMIN_REQUIRED_MESSAGE, code: "UNAUTHORIZED" };
  const parsed = idSchema.safeParse(attendeeId);
  if (!parsed.success) return { success: false, error: "Invalid attendee." };
  try {
    await removeAttendee(parsed.data, "Admin");
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/analytics");
    return { success: true, data: null };
  } catch (err) {
    if (err instanceof BookingError) return { success: false, error: err.message, code: err.code };
    console.error("removeAttendeeAction failed", err);
    return { success: false, error: "Something went wrong." };
  }
}
