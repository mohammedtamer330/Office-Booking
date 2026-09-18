export const dynamic = "force-dynamic";

import { getAnalytics } from "@/lib/admin/analytics-data";
import { getSettings } from "@/lib/settings";
import { todayInAppTz } from "@/lib/time";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { AnalyticsRangePicker } from "@/components/admin/analytics-range-picker";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const sp = await searchParams;
  const settings = await getSettings();
  const start = sp.start ?? settings.bookingStartDate;
  const end = sp.end ?? todayInAppTz();

  const data = await getAnalytics(start, end);

  const metrics = [
    { label: "Total bookings", value: data.total },
    { label: "Check-in rate", value: `${data.checkInRate}%` },
    { label: "No-show rate", value: `${data.noShowRate}%` },
    { label: "Cancellation rate", value: `${data.cancellationRate}%` },
    { label: "Avg. duration", value: `${data.avgDurationMinutes} min` },
    { label: "Most booked room", value: data.byRoom[0]?.name ?? "—" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            {start} → {end}
          </p>
        </div>
        <AnalyticsRangePicker start={start} end={end} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <Card key={m.label} className="p-4">
            <p className="text-xl font-semibold text-ink tabular">{m.value}</p>
            <p className="mt-0.5 text-xs text-muted">{m.label}</p>
          </Card>
        ))}
      </div>

      <AnalyticsCharts data={data} />
    </div>
  );
}
