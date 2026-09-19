"use server";

import { z } from "zod";
import { getDaySchedule, getMonthDays } from "@/lib/schedule";
import type { ActionResult } from "@/lib/action-result";
import type { DaySchedule, MonthDay } from "@/lib/schedule-types";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

// Read-only, public: the same information the homepage already shows.
export async function getDayScheduleAction(date: unknown): Promise<ActionResult<DaySchedule>> {
  const parsed = dateSchema.safeParse(date);
  if (!parsed.success) return { success: false, error: "That date isn't valid." };
  try {
    return { success: true, data: await getDaySchedule(parsed.data) };
  } catch (err) {
    console.error("getDayScheduleAction failed", err);
    return { success: false, error: "Something went wrong while loading the schedule." };
  }
}

export async function getMonthDaysAction(month: unknown): Promise<ActionResult<MonthDay[]>> {
  const parsed = monthSchema.safeParse(month);
  if (!parsed.success) return { success: false, error: "That month isn't valid." };
  try {
    return { success: true, data: await getMonthDays(parsed.data) };
  } catch (err) {
    console.error("getMonthDaysAction failed", err);
    return { success: false, error: "Something went wrong while loading the calendar." };
  }
}
