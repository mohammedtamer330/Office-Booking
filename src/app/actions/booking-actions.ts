"use server";

import { revalidatePath } from "next/cache";
import { createBooking, BookingError } from "@/lib/booking/engine";
import { checkIn, checkOut, cancelBooking } from "@/lib/booking/lifecycle";
import { createBookingSchema } from "@/lib/validation/schemas";
import { checkInUrlForToken, generateQrDataUrl } from "@/lib/qr";
import { headers } from "next/headers";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin, ADMIN_REQUIRED_MESSAGE } from "@/lib/auth/require-admin";
import { getCurrentMember, SIGN_IN_REQUIRED_MESSAGE } from "@/lib/auth/current-member";
import type { ActionResult } from "@/lib/action-result";

export async function createBookingAction(
  rawInput: unknown,
): Promise<ActionResult<{ bookingId: string; bookingCode: string }>> {
  const parsed = createBookingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Whoever is booking is the signed-in AIESEC member — never the client-
  // supplied personId. A signed-in session always overrides it; a request
  // with no session (or a deactivated/unknown Google account) is rejected
  // outright, regardless of what personId the client sent.
  const member = await getCurrentMember();
  if (!member) {
    return { success: false, error: SIGN_IN_REQUIRED_MESSAGE, code: "UNAUTHENTICATED" };
  }
  const input = { ...parsed.data, personId: member.personId };

  try {
    const booking = await createBooking(input);
    revalidatePath("/");
    revalidatePath("/my-bookings");
    return { success: true, data: { bookingId: booking.id, bookingCode: booking.bookingCode } };
  } catch (err) {
    if (err instanceof BookingError) {
      return { success: false, error: err.message, code: err.code };
    }
    console.error(err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function getQrForBookingAction(bookingId: string, qrToken: string) {
  const h = await headers();
  const host = h.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;
  const url = checkInUrlForToken(qrToken, origin);
  const dataUrl = await generateQrDataUrl(url);
  return { url, dataUrl };
}

export async function checkInAction(
  bookingId: string,
  method: "QR" | "BOOKING_PAGE" | "ADMIN_MANUAL",
  actorId: string,
): Promise<ActionResult<{ late: boolean }>> {
  // The public check-in flow now asks for the attendee's name and goes through
  // checkInAttendeeAction. What's left here is the admin's manual override.
  if (!(await isAdmin())) {
    return { success: false, error: "Check-in now needs your name. Please refresh the page and try again.", code: "USE_ATTENDEE_CHECK_IN" };
  }
  try {
    const result = await checkIn(bookingId, method, actorId);
    revalidatePath("/my-bookings");
    revalidatePath("/admin");
    return { success: true, data: { late: result.late } };
  } catch (err) {
    if (err instanceof BookingError) return { success: false, error: err.message, code: err.code };
    console.error(err);
    return { success: false, error: "Something went wrong." };
  }
}

export async function checkOutAction(
  bookingId: string,
  method: "QR" | "BOOKING_PAGE" | "ADMIN_MANUAL",
  actorId: string,
  qrToken?: string,
): Promise<ActionResult<null>> {
  if (method === "ADMIN_MANUAL") {
    if (!(await isAdmin())) {
      return { success: false, error: ADMIN_REQUIRED_MESSAGE, code: "UNAUTHORIZED" };
    }
  } else {
    // Booking ids are visible on the public schedule, so a booking id alone must not be enough
    // to end someone's booking. The owner's private QR link carries the token that proves it.
    const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, bookingId) });
    if (!booking || !qrToken || booking.qrToken !== qrToken) {
      return {
        success: false,
        error: "Open the booking's QR link to check out.",
        code: "UNAUTHORIZED",
      };
    }
  }
  try {
    await checkOut(bookingId, method, actorId);
    revalidatePath("/");
    revalidatePath("/my-bookings");
    revalidatePath("/admin");
    return { success: true, data: null };
  } catch (err) {
    if (err instanceof BookingError) return { success: false, error: err.message, code: err.code };
    console.error(err);
    return { success: false, error: "Something went wrong." };
  }
}

export async function cancelBookingAction(
  bookingId: string,
  cancelledBy: "user" | "admin",
  actorId: string,
): Promise<ActionResult<null>> {
  if (cancelledBy === "admin" && !(await isAdmin())) {
    return { success: false, error: ADMIN_REQUIRED_MESSAGE, code: "UNAUTHORIZED" };
  }
  try {
    await cancelBooking(bookingId, cancelledBy, actorId);
    revalidatePath("/my-bookings");
    revalidatePath("/admin");
    return { success: true, data: null };
  } catch (err) {
    if (err instanceof BookingError) return { success: false, error: err.message, code: err.code };
    console.error(err);
    return { success: false, error: "Something went wrong." };
  }
}
