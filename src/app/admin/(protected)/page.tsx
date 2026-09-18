export const dynamic = "force-dynamic";

import { getDashboardData } from "@/lib/admin/dashboard-data";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildFunctionBrand } from "@/lib/config/function-branding";

const STATUS_VARIANT: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  UPCOMING: "info",
  CHECKED_IN: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
  NO_SHOW: "warning",
};

export default async function AdminDashboardPage() {
  const { todaysBookings, counts, liveRooms } = await getDashboardData();

  const cards = [
    { label: "Today's bookings", value: counts.today },
    { label: "Currently checked in", value: counts.checkedIn },
    { label: "Upcoming", value: counts.upcoming },
    { label: "Completed today", value: counts.completedToday },
    { label: "No shows", value: counts.noShows },
    { label: "Cancelled", value: counts.cancelled },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Live overview of today&apos;s activity.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-2xl font-semibold text-ink tabular">{c.value}</p>
            <p className="mt-0.5 text-xs text-muted">{c.label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-ink">Live rooms</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {liveRooms.map(({ room, status, current, next }) => (
            <Card key={room.id} className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">{room.name}</span>
                <Badge
                  variant={status === "Occupied" ? "danger" : status === "Upcoming" ? "warning" : "success"}
                >
                  {status}
                </Badge>
              </div>
              {current && (
                <p className="mt-2 text-sm text-muted">
                  {current.person.name} until {current.endTime.slice(0, 5)}
                </p>
              )}
              {!current && next && (
                <p className="mt-2 text-sm text-muted">
                  Next: {next.person.name} at {next.startTime.slice(0, 5)}
                </p>
              )}
              {!current && !next && <p className="mt-2 text-sm text-muted">No bookings for the rest of today.</p>}
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s schedule</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {todaysBookings.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No bookings today.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="py-2 pr-3 font-medium">Time</th>
                    <th className="py-2 pr-3 font-medium">Room</th>
                    <th className="py-2 pr-3 font-medium">Person</th>
                    <th className="py-2 pr-3 font-medium">Function</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todaysBookings.map((b) => {
                    const brand = buildFunctionBrand(b.person.function.color);
                    return (
                      <tr key={b.id} className="border-b border-line last:border-0">
                        <td className="py-2.5 pr-3 tabular">
                          {b.startTime.slice(0, 5)}–{b.endTime.slice(0, 5)}
                        </td>
                        <td className="py-2.5 pr-3">{b.room.name}</td>
                        <td className="py-2.5 pr-3">{b.person.name}</td>
                        <td className="py-2.5 pr-3">
                          <Badge style={{ backgroundColor: brand.tint, color: brand.text }}>
                            {b.person.function.label}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge variant={STATUS_VARIANT[b.status]}>{b.status.replace("_", " ")}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
