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
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-y-1 px-5 py-2 sm:py-3.5">
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

        <nav className="order-last flex w-full items-center justify-between gap-1 whitespace-nowrap border-t border-line pt-1 text-[13px] font-medium sm:order-none sm:w-auto sm:justify-start sm:border-0 sm:pt-0">
          <Link href="/?book=1" className="rounded-md px-2.5 py-2 text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink sm:py-1.5">
            Book<span className="hidden sm:inline"> a room</span>
          </Link>

          <details className="group relative">
            <summary className="flex list-none items-center gap-1 rounded-md px-2.5 py-2 text-ink-soft transition-colors sm:py-1.5 marker:content-[''] hover:bg-black/[0.04] hover:text-ink [&::-webkit-details-marker]:hidden">
              <span className="sm:hidden">Rooms</span>
              <span className="hidden sm:inline">Room availability</span>
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute left-0 z-30 mt-1 w-48 sm:left-auto sm:right-0 rounded-lg border border-line bg-surface p-1.5 shadow-[var(--shadow-card)]">
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

          <Link href="/my-bookings" className="rounded-md px-2.5 py-2 sm:py-1.5 text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink">
            My bookings
          </Link>
          <Link href="/check-in" className="rounded-md px-2.5 py-2 sm:py-1.5 text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink">
            Check in
          </Link>
        </nav>
      </div>
    </header>
  );
}
