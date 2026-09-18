"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cancelBookingAction } from "@/app/actions/booking-actions";

type BookingRow = {
  id: string;
  bookingCode: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  qrToken: string;
  room: { name: string };
};

const GROUPS: { key: string; label: string; statuses: string[] }[] = [
  { key: "upcoming", label: "Upcoming", statuses: ["UPCOMING"] },
  { key: "active", label: "Active", statuses: ["CHECKED_IN"] },
  { key: "completed", label: "Completed", statuses: ["COMPLETED"] },
  { key: "cancelled", label: "Cancelled", statuses: ["CANCELLED"] },
  { key: "no-show", label: "No Show", statuses: ["NO_SHOW"] },
];

const STATUS_VARIANT: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  UPCOMING: "info",
  CHECKED_IN: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
  NO_SHOW: "warning",
};

export function MyBookingsList({ bookings, personId }: { bookings: BookingRow[]; personId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCancel(bookingId: string) {
    setError(null);
    setCancellingId(bookingId);
    startTransition(async () => {
      const result = await cancelBookingAction(bookingId, "user", personId);
      if (!result.success) {
        setError(result.error);
      } else {
        router.refresh();
      }
      setCancellingId(null);
    });
  }

  return (
    <Tabs defaultValue="upcoming">
      <TabsList>
        {GROUPS.map((g) => (
          <TabsTrigger key={g.key} value={g.key}>
            {g.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {GROUPS.map((g) => {
        const items = bookings.filter((b) => g.statuses.includes(b.status));
        return (
          <TabsContent key={g.key} value={g.key}>
            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No bookings here.</p>
            ) : (
              <div className="grid gap-3">
                {items.map((b) => (
                  <Card key={b.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink">{b.room.name}</span>
                      <Badge variant={STATUS_VARIANT[b.status]}>{b.status.replace("_", " ")}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted tabular">
                      {b.date} · {b.startTime.slice(0, 5)}–{b.endTime.slice(0, 5)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted tabular">{b.bookingCode}</p>
                    <div className="mt-3 flex gap-2">
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/check-in/${b.qrToken}`}>Open</Link>
                      </Button>
                      {b.status === "UPCOMING" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending && cancellingId === b.id}
                          onClick={() => handleCancel(b.id)}
                        >
                          {isPending && cancellingId === b.id ? "Cancelling…" : "Cancel"}
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
