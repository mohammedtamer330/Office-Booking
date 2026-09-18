"use server";

import { getBookedSlots } from "@/lib/booking/availability";

export async function getAvailabilityAction(roomId: string, date: string) {
  return getBookedSlots(roomId, date);
}
