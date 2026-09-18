import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function SiteHeader() {
  const activeRooms = await db.select().from(rooms).where(eq(rooms.active, true));

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
          <span className="hidden text-[13px] font-medium text-muted sm:inline">Office Booking</span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap text-[13px] font-medium">
          <Link href="/" className="rounded-md px-2.5 py-1.5 text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink">
            Book a room
          </Link>

          <details className="group relative">
            <summary className="flex list-none items-center gap-1 rounded-md px-2.5 py-1.5 text-ink-soft transition-colors marker:content-[''] hover:bg-black/[0.04] hover:text-ink [&::-webkit-details-marker]:hidden">
              Room availability
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 z-30 mt-1 w-48 rounded-lg border border-line bg-surface p-1.5 shadow-[var(--shadow-card)]">
              <Link href="/availability" className="block rounded-md px-3 py-2 text-ink-soft hover:bg-black/[0.04] hover:text-ink">
                All rooms
              </Link>
              <div className="my-1 h-px bg-line" />
              {activeRooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/availability?room=${room.slug}`}
                  className="block rounded-md px-3 py-2 text-ink-soft hover:bg-black/[0.04] hover:text-ink"
                >
                  {room.name}
                </Link>
              ))}
            </div>
          </details>

          <Link href="/my-bookings" className="rounded-md px-2.5 py-1.5 text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink">
            My bookings
          </Link>
          <Link href="/check-in" className="rounded-md px-2.5 py-1.5 text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink">
            Check in
          </Link>
        </nav>
      </div>
    </header>
  );
}
