export const dynamic = "force-dynamic";

import { getRoomTimelines } from "@/lib/room-timeline";
import { todayInAppTz } from "@/lib/time";
import { RoomAvailabilityBoard } from "@/components/booking/room-availability-board";
import Link from "next/link";

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = sp.date ?? todayInAppTz();
  const entries = await getRoomTimelines(date);

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Room availability</h1>
          <p className="mt-1 text-sm text-muted tabular">{date}</p>
        </div>
        <Link href="/" className="text-sm text-ink underline decoration-line-strong hover:decoration-ink">
          Book a room →
        </Link>
      </div>
      <RoomAvailabilityBoard entries={entries} date={date} />
    </div>
  );
}
