"use server";

import { revalidatePath } from "next/cache";
import { createBooking, BookingError } from "@/lib/booking/engine";
import { checkIn, checkOut, cancelBooking } from "@/lib/booking/lifecycle";
import { createBookingSchema } from "@/lib/validation/schemas";
import { checkInUrlForToken, generateQrDataUrl } from "@/lib/qr";
import { headers } from "next/headers";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string; code?: string };

export async function createBookingAction(
  rawInput: unknown,
): Promise<ActionResult<{ bookingId: string; bookingCode: string }>> {
  const parsed = createBookingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const booking = await createBooking(parsed.data);
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
): Promise<ActionResult<null>> {
  try {
    await checkOut(bookingId, method, actorId);
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
