import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logos/aiesec-suez.png"
            alt="AIESEC in Suez"
            width={140}
            height={36}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted sm:inline">Office Booking</span>
          <Image
            src="/logos/aiesec-official.png"
            alt="AIESEC"
            width={120}
            height={28}
            className="h-5 w-auto object-contain opacity-80"
          />
        </div>
      </div>
    </header>
  );
}
