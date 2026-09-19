-- Team check-in: one booking, many attendees.
--
-- Purely additive — no existing table or column is altered, so the currently
-- deployed code keeps working if this is applied before the new release goes
-- out. Run `npm run db:migrate` first, then deploy.

CREATE TYPE "attendance_status" AS ENUM ('ON_TIME', 'LATE');

CREATE TABLE IF NOT EXISTS "booking_attendees" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "attendee_name" text NOT NULL,
  "name_key" text NOT NULL,
  "person_id" uuid REFERENCES "people"("id") ON DELETE SET NULL,
  "status" "attendance_status" NOT NULL DEFAULT 'ON_TIME',
  "method" "check_in_method" NOT NULL DEFAULT 'BOOKING_PAGE',
  "checked_in_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- The real duplicate guard: the same person (case/spacing-insensitive) can be
-- recorded only once per booking, even if two taps land at the same instant.
CREATE UNIQUE INDEX IF NOT EXISTS "booking_attendees_booking_name_uniq"
  ON "booking_attendees" ("booking_id", "name_key");
CREATE INDEX IF NOT EXISTS "booking_attendees_booking_idx"
  ON "booking_attendees" ("booking_id");

-- Carry history forward. Before this change a check-in was recorded against
-- the booking owner (check_ins.actor_id = person id). Turn each of those into
-- an attendance row so past bookings show "1 checked in" instead of "0".
-- Admin manual check-ins (actor_id = 'admin') have no person and are skipped.
INSERT INTO "booking_attendees"
  ("booking_id", "attendee_name", "name_key", "person_id", "status", "method", "checked_in_at")
SELECT DISTINCT ON (ci.booking_id, lower(p.name))
  ci.booking_id,
  p.name,
  lower(regexp_replace(btrim(p.name), '\s+', ' ', 'g')),
  p.id,
  CASE WHEN b.late_check_in THEN 'LATE'::attendance_status ELSE 'ON_TIME'::attendance_status END,
  ci.method,
  ci.timestamp
FROM "check_ins" ci
JOIN "bookings" b ON b.id = ci.booking_id
JOIN "people" p ON p.id::text = ci.actor_id
ORDER BY ci.booking_id, lower(p.name), ci.timestamp
ON CONFLICT DO NOTHING;
