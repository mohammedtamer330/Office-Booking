import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export type AppSettings = typeof settings.$inferSelect;

/**
 * Reads the singleton settings row. Every business rule that the spec asks
 * to be "configurable from Admin Settings" (booking period, min/max
 * duration, check-in window, late policy, no-show grace, cancellation
 * cutoff, EB Room password hash) is read from here at request time — never
 * hardcoded in booking logic.
 */
export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (rows.length === 0) {
    throw new Error(
      "Settings row is missing. Run `npm run db:seed` to initialize default settings.",
    );
  }
  return rows[0];
}
