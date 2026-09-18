"use server";

import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";

type Result = { success: true; token: string } | { success: false; error: string };

/** Looks up a booking by its human-friendly code (e.g. BK-2026-0001) so
 * someone can check in/out without scanning a QR — used by the /check-in
 * landing page. */
export async function lookupBookingByCodeAction(rawCode: string): Promise<Result> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { success: false, error: "Enter a booking code." };

  const booking = await db.query.bookings.findFirst({ where: ilike(bookings.bookingCode, code) });
  if (!booking) return { success: false, error: "No booking found with that code." };

  return { success: true, token: booking.qrToken };
}
