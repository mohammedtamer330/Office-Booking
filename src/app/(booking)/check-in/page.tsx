export const dynamic = "force-dynamic";

import Link from "next/link";
import { CheckInLookupForm } from "@/components/booking/check-in-lookup-form";
import { BookingCard } from "@/components/office/booking-card";
import { getDaySchedule } from "@/lib/schedule";
import { todayInAppTz, nowInAppTz } from "@/lib/time";

export default async function CheckInLandingPage() {
  const today = todayInAppTz();
  const schedule = await getDaySchedule(today).catch(() => null);
  const nowMs = nowInAppTz().getTime();
  const bookings = (schedule?.bookings ?? [])
    .filter((b) => b.status === "UPCOMING" || b.status === "CHECKED_IN")
    .filter((b) => nowMs < b.endsAtMs)
    .sort((a, b) => a.startsAtMs - b.startsAtMs);

  return (
    <div className="mx-auto max-w-md px-5 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold text-ink">Check in</h1>
      <p className="mt-1 text-sm text-muted">
        Find your team&apos;s booking below, or scan the QR code from the confirmation page.
      </p>

      <section className="mt-6" aria-labelledby="today-bookings">
        <h2 id="today-bookings" className="text-[15px] font-semibold text-ink">
          Today&apos;s bookings
        </h2>
        {bookings.length === 0 ? (
          <p className="mt-2.5 rounded-lg bg-black/[0.035] px-3 py-3 text-sm text-muted">
            No bookings are running or coming up today.
          </p>
        ) : (
          <div className="mt-2.5 space-y-2.5">
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} nowMs={nowMs} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-line bg-surface p-5" aria-labelledby="code-heading">
        <h2 id="code-heading" className="text-[15px] font-semibold text-ink">
          Have a booking code?
        </h2>
        <div className="mt-3">
          <CheckInLookupForm />
        </div>
      </section>

      <p className="mt-4 text-center text-sm text-muted">
        Don&apos;t have your code?{" "}
        <Link href="/my-bookings" className="text-brand hover:underline">
          Find it in My bookings
        </Link>
      </p>
    </div>
  );
}
