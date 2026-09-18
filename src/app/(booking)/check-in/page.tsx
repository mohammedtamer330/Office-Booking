export const dynamic = "force-dynamic";

import { CheckInLookupForm } from "@/components/booking/check-in-lookup-form";
import Link from "next/link";

export default function CheckInLandingPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <h1 className="text-2xl font-semibold text-ink">Check in / check out</h1>
      <p className="mt-1 text-sm text-muted">
        Scan the QR code on your confirmation page, or enter your booking code below.
      </p>

      <div className="mt-6 rounded-xl border border-line bg-surface p-6">
        <CheckInLookupForm />
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        Don&apos;t have your code?{" "}
        <Link href="/my-bookings" className="text-brand hover:underline">
          Find it in My Bookings
        </Link>
      </p>
    </div>
  );
}
