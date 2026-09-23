export const dynamic = "force-dynamic";

import Link from "next/link";
import { nowInAppTz } from "@/lib/time";
import { MyBookingsList } from "@/components/booking/my-bookings-list";
import { getPersonBookings } from "@/lib/schedule";
import { getCurrentMember } from "@/lib/auth/current-member";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/primitives";

export default async function MyBookingsPage() {
  const member = await getCurrentMember();

  if (!member) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <FadeIn>
          <h1 className="text-2xl font-semibold text-ink">My bookings</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in with your AIESEC Google account to see the bookings you made and who has checked in to each.
          </p>
          <Button asChild size="touch" className="mt-5">
            <Link href="/login?callbackUrl=/my-bookings">Sign in with Google</Link>
          </Button>
        </FadeIn>
      </div>
    );
  }

  // Identity comes only from the signed-in session above — never a client-
  // supplied id, so there is no way to see anyone else's bookings by editing
  // a URL or query parameter.
  const personBookings = await getPersonBookings(member.personId);

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">My bookings</h1>
          <p className="mt-1 text-sm text-muted">Signed in as {member.name}.</p>
        </div>
      </div>

      <div className="mt-6">
        <MyBookingsList bookings={personBookings} personId={member.personId} nowMs={nowInAppTz().getTime()} />
      </div>
    </div>
  );
}
