-- This migration is the actual guarantee behind "two people can never book
-- the same room at overlapping times", enforced by Postgres itself rather
-- than by application code. It works even if:
--   * the application has a bug,
--   * two requests hit the database at literally the same instant,
--   * someone crafts a raw API request that skips the normal app logic.
--
-- btree_gist lets a GiST exclusion constraint index a plain equality column
-- (room_id) alongside a range type (the booking's time span).
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (
    room_id WITH =,
    tsrange(
      (date + start_time)::timestamp,
      (date + end_time)::timestamp,
      '[)'
    ) WITH &&
  )
  WHERE (status NOT IN ('CANCELLED', 'NO_SHOW'));

-- Helpful indexes for the queries the app runs constantly.
CREATE INDEX IF NOT EXISTS "bookings_room_date_idx" ON "bookings" ("room_id", "date");
CREATE INDEX IF NOT EXISTS "bookings_person_idx" ON "bookings" ("person_id");
CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings" ("status");
CREATE INDEX IF NOT EXISTS "bookings_qr_token_idx" ON "bookings" ("qr_token");
CREATE UNIQUE INDEX IF NOT EXISTS "people_name_unique_idx" ON "people" (lower(name));
