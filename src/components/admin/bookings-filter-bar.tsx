"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function BookingsFilterBar({
  rooms,
  current,
}: {
  rooms: { id: string; name: string }[];
  current: { q?: string; room?: string; status?: string; date?: string };
}) {
  const router = useRouter();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams();
    if (current.q) params.set("q", current.q);
    if (current.room) params.set("room", current.room);
    if (current.status) params.set("status", current.status);
    if (current.date) params.set("date", current.date);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin/bookings?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Input
        placeholder="Search name or code…"
        defaultValue={current.q}
        className="max-w-xs"
        onKeyDown={(e) => {
          if (e.key === "Enter") updateParam("q", (e.target as HTMLInputElement).value);
        }}
      />
      <select
        className="h-10 rounded-lg border border-line-strong bg-surface px-3 text-sm"
        defaultValue={current.room ?? ""}
        onChange={(e) => updateParam("room", e.target.value)}
      >
        <option value="">All rooms</option>
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <select
        className="h-10 rounded-lg border border-line-strong bg-surface px-3 text-sm"
        defaultValue={current.status ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
      >
        <option value="">All statuses</option>
        <option value="UPCOMING">Upcoming</option>
        <option value="CHECKED_IN">Checked In</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
        <option value="NO_SHOW">No Show</option>
      </select>
      <input
        type="date"
        className="h-10 rounded-lg border border-line-strong bg-surface px-3 text-sm"
        defaultValue={current.date}
        onChange={(e) => updateParam("date", e.target.value)}
      />
    </div>
  );
}
