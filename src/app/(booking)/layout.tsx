import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { OfficeUiProvider } from "@/components/office/office-ui-provider";
import { getBookingBundle } from "@/lib/booking-bundle";
import { getCurrentMember } from "@/lib/auth/current-member";

export const dynamic = "force-dynamic";

export default async function BookingLayout({ children }: { children: React.ReactNode }) {
  const [bundle, currentMember] = await Promise.all([getBookingBundle(), getCurrentMember()]);
  return (
    <OfficeUiProvider bundle={bundle} currentMember={currentMember}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 bg-background">{children}</main>
        <footer className="border-t border-line py-5 text-center text-xs text-muted">
          <Image
            src="/logos/aiesec-official.png"
            alt="AIESEC"
            width={100}
            height={24}
            className="mx-auto mb-2 h-4 w-auto object-contain opacity-60"
          />
          <p>AIESEC in Suez · Internal Office Booking</p>
          <p className="mt-1">Website developed by Mohammed Tamer</p>
        </footer>
      </div>
    </OfficeUiProvider>
  );
}
