-- Hand-trimmed: `drizzle-kit generate` diffed against a stale snapshot that
-- predates the hand-written 0001-0003 migrations (see scripts/migrate.ts's
-- header comment — this project layers hand-written SQL on top of
-- drizzle-kit's own history, so its snapshot baseline lags behind reality).
-- The auto-generated file tried to re-create booking_attendees/
-- attendance_status, which already exist. Only the actual new change below
-- is kept.
ALTER TABLE "people" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_email_unique" UNIQUE("email");
