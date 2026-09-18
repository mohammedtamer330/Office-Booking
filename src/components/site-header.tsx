import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur-sm">
      <div className="h-[3px] bg-brand" />
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logos/aiesec-suez.png"
            alt="AIESEC in Suez"
            width={150}
            height={38}
            className="h-8 w-auto object-contain"
            priority
          />
          <span className="hidden text-[13px] font-medium text-muted sm:inline">
            Office Booking
          </span>
        </Link>
        <nav className="flex items-center gap-5">
          <Link
            href="/availability"
            className="text-[13px] font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Room availability
          </Link>
          <Link
            href="/my-bookings"
            className="hidden text-[13px] font-medium text-ink-soft transition-colors hover:text-ink sm:inline"
          >
            My bookings
          </Link>
          <Image
            src="/logos/aiesec-official.png"
            alt="AIESEC"
            width={110}
            height={26}
            className="h-[18px] w-auto object-contain opacity-70"
          />
        </nav>
      </div>
    </header>
  );
}
