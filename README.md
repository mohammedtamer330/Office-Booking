# AIESEC in Suez — Office Booking Platform

A real, database-backed internal room booking system: a guided
date → room → time → team → confirm booking flow, **team check-in** (one
person books, every attendee checks in with their own name), QR check-out,
no-show detection, cancellation, and a full admin dashboard (live room
status, bookings table with attendance, calendar, analytics, audit log,
people management, settings).

This is a working application, not a mockup — every rule in the original
spec (role/function/room permissions, EB Room password, booking-period and
duration limits, check-in windows, no-show grace, cancellation cutoff) is
enforced **server-side**, re-validated independently of whatever the
frontend shows. The single most important guarantee — that two people can
never book the same room at overlapping times — is enforced by Postgres
itself via a `GiST EXCLUDE` constraint (see
`drizzle/0001_booking_overlap_guard.sql`), not by application code, so it
holds even under a race condition or a hand-crafted API request. This was
stress-tested directly against Postgres: 10 truly concurrent requests for
the identical slot → exactly 1 succeeds, 9 get a friendly "already booked"
error, zero raw errors.

## Tech stack

- **Next.js 16** (App Router, TypeScript, Server Actions)
- **Tailwind CSS v4**
- **Drizzle ORM** + `postgres.js` — works with any Postgres (Vercel Postgres,
  Neon, Supabase, Railway, your own server). Chosen over Prisma specifically
  because it's pure JS/TS with no native binary to download, which also
  makes it a better fit for "just deploy to Vercel."
- **NextAuth (Auth.js) v5** — single admin account, credentials + bcrypt
- **Zod** — shared client/server validation
- **Recharts** — analytics charts
- **qrcode** — QR generation

## What's implemented

- Homepage dashboard: hero, monthly calendar (any month/year, swipe on
  phones), a per-room timeline for the selected day, Today, Upcoming
  bookings and live Room status. Data is loaded per month / per day, never
  the whole bookings table (`src/lib/schedule.ts`).
- 5-step booking flow (date → room → time → team → confirm) in a bottom
  sheet on phones and a dialog on desktop
  (`src/components/office/book-room-dialog.tsx`). It reuses the same
  role → function → person permission tables as before, with dynamic
  function branding (colors come from the database, not hardcoded per
  component — see `src/lib/config/function-branding.ts`)
- **Team check-in**: the booking owner books, and each attendee checks in
  individually by typing their own name. The attendee list only ever shows
  people who actually checked in — there is no invented roster. One shared
  modal serves every entry point (homepage cards, timeline, booking
  details, My Bookings, QR page, `/check-in`), so the logic lives in one
  place: `src/lib/booking/attendance.ts` (server) and
  `src/components/office/check-in-form.tsx` (UI).
- Server-side booking engine running the full validation pipeline: person
  active → role/function link → room exists → room permission → EB Room
  password (bcrypt, generic error) → booking period → time range → duration
  → conflict check → atomic insert → QR token → audit log
  (`src/lib/booking/engine.ts`)
- Database-level overlap prevention via a Postgres `EXCLUDE` constraint —
  the real backstop against race conditions
- QR code generation and a check-in page that reads the booking by token.
  The configurable check-in window and late-check-in policy apply to every
  attendee individually (late arrivals are flagged per person)
- Check-out with actual-duration calculation, cancellation with a
  configurable cutoff, and no-show detection (computed live, plus a cron
  endpoint that persists it — see `vercel.json`)
- My Bookings page (pick your name, see Upcoming/Active/Completed/
  Cancelled/No Show, who has checked in to each, cancel eligible bookings)
- Admin dashboard: today's counts (including people checked in), live room
  status, today's schedule
- Admin bookings table with search/filter (room, status, date), pagination,
  an attendance column (open it to see names and remove a mistaken entry)
  and row actions (check in/out, cancel)
- Admin calendar (day view, function-colored blocks across all rooms)
- Admin analytics (bookings/day, room utilization, peak hours, usage by
  role/function, check-in/no-show/cancellation rates, avg. duration, people
  checked in, average people per booking, late-arrival rate) with a
  date-range filter
- Admin audit log (every booking/settings/person mutation, with actor,
  action, before/after data)
- Admin people management (add/edit/deactivate, assign role + function)
- Admin settings: booking period, min/max duration, check-in window,
  late-check-in policy, no-show grace, cancellation cutoff — all read live
  by the booking engine, nothing hardcoded
- EB Room password change (admin settings), stored as a bcrypt hash, never
  sent to the frontend
- CSV export (`/api/admin/export`)
- Admin auth (NextAuth credentials, single admin password hash via env var)
  with middleware protecting every `/admin` and `/api/admin` route —
  verified over real HTTP: unauthenticated requests get redirected/401'd

## Team check-in: data model and rules

- Migration `drizzle/0003_booking_attendance.sql` is **additive only**. It
  adds the `attendance_status` enum and the `booking_attendees` table
  (booking, name as typed, normalised `name_key`, optional link to a known
  person, ON_TIME / LATE, method, timestamp). Nothing existing is altered.
  Historical owner check-ins are backfilled into `booking_attendees`
  (admin-manual check-ins have no name, so they are skipped). The migration
  is idempotent.
- **Duplicates** are prevented by a unique index on
  `(booking_id, name_key)`, not by application code, so two people typing
  the same name at the same moment still produce exactly one row
  (stress-tested: 12 simultaneous requests → 1 success, 11 friendly
  "already checked in" errors). Matching ignores case and extra spaces.
- The **first attendee** to arrive also moves the booking itself to
  CHECKED_IN (once, atomically), so no-show detection, analytics and the
  admin table keep working exactly as before.
- Names are validated server-side (2–80 characters, letters from any
  script including Arabic, spaces and `. ' -`). A name is linked to a
  person record only on an exact match with an active person; otherwise it
  stays free text. Up to 60 attendees per booking.
- **Check-out** stays a booking-level action for the owner, using the
  private QR link.
- Admins can remove an attendee (audit-logged).

## Security notes

- Every admin Server Action re-checks the admin session itself. Next.js
  Server Actions can be invoked with a direct POST, so the `/admin`
  middleware alone is not enough.
- Only the person who made a booking can cancel it as a user; admins cancel
  through the admin session.
- The app has no member accounts by design. Booking IDs are visible on the
  public schedule and My Bookings shows a person's bookings (including QR
  links) to anyone who picks their name, so the QR-token check on check-out
  stops casual misuse, not a determined colleague.

## Timezone

All booking times are wall-clock **Africa/Cairo** (`APP_TIMEZONE` in
`src/lib/time.ts`). `nowInAppTz()` returns a real instant, so check-in
windows, late detection, no-show sweeping and "start time in the past"
behave the same whether the server runs in Cairo time or UTC (Vercel). An
earlier version was only correct on a machine whose timezone matched Cairo.

## Known simplifications (fast-follow candidates, not required for v1)

- **Editing an existing booking's time/room** isn't in the admin table yet
  (cancel + rebook covers the same outcome for now).
- **Admin calendar** is day-view only; week/month views would reuse the same data
  layer.
- **Function color editing from the UI** isn't wired up yet — colors are set
  via the seed file (`src/lib/config/seed-data.ts`) and live in the
  `functions.color` column, so an admin UI for it is a small addition.
- The **add/edit person dialog** doesn't yet filter the function dropdown by
  the selected role (the booking engine still independently rejects any
  invalid role/function combination server-side, so this is a UX
  polish item, not a safety gap).
- **Multi-admin accounts**: the architecture supports it (swap the
  Credentials provider's `authorize` for a DB lookup against a future
  `admins` table) but v1 ships with one shared admin password, per the
  original "predefined people, no accounts yet" scope.

## Local development

```bash
npm install
cp .env.example .env
# edit .env: DATABASE_URL, ADMIN_PASSWORD_HASH (see the escaping note
# inside .env.example — it matters), NEXTAUTH_SECRET

npm run db:generate   # only needed if you change src/db/schema.ts
npm run db:migrate    # applies drizzle/*.sql in order, including the
                       # overlap-guard constraint
npm run db:seed       # populates roles, functions, rooms, people, settings

npm run dev
```

Visit `http://localhost:3000` for the booking flow, `/admin/login` for the
admin dashboard.

## Deploying to Vercel

1. **Push this project to a Git repo** (GitHub/GitLab/Bitbucket) and import
   it in Vercel, or run `vercel` from this folder.
2. **Add a Postgres database.** In your Vercel project → Storage → Create
   Database → Postgres (this provisions a Neon-backed database and can wire
   `DATABASE_URL` into your project automatically). Any other Postgres
   provider works too — just set `DATABASE_URL` yourself.
3. **Set environment variables** in Project Settings → Environment
   Variables (paste values directly — the `.env` file's `\$`-escaping note
   does **not** apply here, since Vercel injects env vars as literal
   strings, not through a file parser):
   - `DATABASE_URL` (from step 2, or your own provider)
   - `ADMIN_PASSWORD_HASH` — generate locally with:
     `node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"`
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
   - `EB_ROOM_PASSWORD` — only read once, during the first seed run
   - `CRON_SECRET` — optional, protects the no-show sweep endpoint
4. **Run migrations + seed against the production database.** Easiest way:
   pull the production env vars locally and run the scripts against them:
   ```bash
   vercel env pull .env.production.local
   DATABASE_URL=<paste-from-that-file> npm run db:migrate
   DATABASE_URL=<paste-from-that-file> npm run db:seed
   ```
   (Or run them from any machine that can reach your Postgres instance.)
5. **Deploy.** Vercel Cron (configured in `vercel.json`) will hit
   `/api/cron/no-show` every 10 minutes to persist no-show status; this is
   a Vercel Pro feature — on the Hobby plan, no-show status still displays
   correctly everywhere in the app (it's computed live), it just won't be
   permanently written to the database until someone views/refreshes a
   relevant page, or you trigger the endpoint another way.

## Changing the EB Room password later

Admin → Settings → EB Room password. This updates the bcrypt hash in the
database directly — you don't need to touch environment variables or
redeploy.

## Project structure

```
src/
  db/schema.ts                Drizzle schema — the full data model
  lib/booking/engine.ts       Core booking creation + validation pipeline
  lib/booking/lifecycle.ts    Check-in window rules / check-out / cancel / no-show
  lib/booking/attendance.ts   Per-attendee check-in (the only writer of attendance)
  lib/schedule.ts             Day / month / upcoming / details read loaders
  components/office/          Calendar, timeline, booking + check-in dialogs
  lib/config/                 Function branding + the seed source-of-truth
  lib/validation/schemas.ts   Zod schemas (shared client/server)
  app/actions/                Server actions (the only mutation path)
  app/(booking)/              Public booking flow, my-bookings, check-in
  app/admin/                  Admin dashboard (login + protected routes)
  app/api/                    NextAuth handler, CSV export, no-show cron
drizzle/                      Generated + hand-written SQL migrations
scripts/migrate.ts            Applies drizzle/*.sql in order
scripts/seed.ts               Populates roles/functions/rooms/people/settings
```
