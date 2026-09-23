"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckInButton } from "@/components/office/booking-buttons";
import { FunctionChip } from "@/components/office/function-chip";
import { useOfficeUi } from "@/components/office/office-ui-provider";
import { cancelBookingAction } from "@/app/actions/booking-actions";
import { formatDayLong, formatRange } from "@/lib/schedule-types";
import { StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import type { MyBooking } from "@/lib/schedule";

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

export function MyBookingsList({
  bookings,
  personId,
  nowMs,
}: {
  bookings: MyBooking[];
  personId: string;
  nowMs: number;
}) {
  const router = useRouter();
  const { openDetails, rememberPerson } = useOfficeUi();
  const [isPending, startTransition] = useTransition();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Viewing your bookings tells the app who you are on this device (shows "Manage booking" on your own bookings).
  useEffect(() => {
    rememberPerson(personId);
  }, [personId, rememberPerson]);

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

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      {GROUPS.map((g) => {
        const items = bookings.filter((b) => g.statuses.includes(b.summary.status));
        return (
          <TabsContent key={g.key} value={g.key}>
            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No bookings here.</p>
            ) : (
              <StaggerContainer className="grid gap-3" stagger={0.05}>
                {items.map(({ summary: s, attendees, bookingCode, qrToken }) => (
                  <StaggerItem key={s.id}>
                  <Card className="p-4 transition-shadow duration-200 hover:shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between gap-3">
                      <FunctionChip label={s.functionLabel} color={s.functionColor} />
                      <Badge variant={STATUS_VARIANT[s.status]}>{s.status.replace("_", " ")}</Badge>
                    </div>
                    <p className="mt-2.5 font-medium text-ink">{s.roomName}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">{formatDayLong(s.date)}</p>
                    <p className="text-sm text-muted tabular">{formatRange(s.startTime, s.endTime)}</p>
                    <p className="mt-2 text-xs text-muted">
                      Booked by <span className="text-ink-soft">{s.ownerName}</span> ·{" "}
                      <span className="tabular">{bookingCode}</span>
                    </p>

                    {s.status !== "CANCELLED" && (
                      <div className="mt-3 rounded-lg bg-black/[0.035] px-3 py-2.5">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                          <Users className="size-3.5" aria-hidden />
                          {attendees.length === 0 ? "No one has checked in yet" : `${attendees.length} checked in`}
                        </p>
                        {attendees.length > 0 && (
                          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-soft">
                            {attendees.map((a) => (
                              <li key={a.id} className="flex items-center gap-1">
                                <Check className="size-3.5 text-success" strokeWidth={3} aria-hidden />
                                {a.name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <CheckInButton booking={s} nowMs={nowMs} size="touch" />
                      <Button variant="secondary" size="touch" onClick={() => openDetails(s.id)}>
                        View attendance
                      </Button>
                      <Button asChild variant="ghost" size="touch">
                        <Link href={`/check-in/${qrToken}`}>QR page</Link>
                      </Button>
                      {s.status === "UPCOMING" && (
                        <Button
                          variant="outline"
                          size="touch"
                          disabled={isPending && cancellingId === s.id}
                          onClick={() => handleCancel(s.id)}
                        >
                          {isPending && cancellingId === s.id ? "Cancelling…" : "Cancel"}
                        </Button>
                      )}
                    </div>
                  </Card>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
