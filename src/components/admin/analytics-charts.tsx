"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { buildFunctionBrand } from "@/lib/config/function-branding";

type AnalyticsData = {
  byDay: { date: string; count: number }[];
  byRoom: { name: string; count: number }[];
  byHour: { hour: number; count: number }[];
  byRole: { label: string; count: number }[];
  byFunction: { label: string; count: number; color: string | null }[];
};

export function AnalyticsCharts({ data }: { data: AnalyticsData }) {
  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Bookings per day</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.byDay}>
              <CartesianGrid stroke="#e7e5e1" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#14151a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Room utilization</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.byRoom}>
              <CartesianGrid stroke="#e7e5e1" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#5b6470" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Peak booking hours</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.byHour}>
              <CartesianGrid stroke="#e7e5e1" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip labelFormatter={(h) => `${h}:00`} />
              <Bar dataKey="count" fill="#14151a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage by function</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {data.byFunction
              .sort((a, b) => b.count - a.count)
              .map((f) => {
                const brand = buildFunctionBrand(f.color);
                const max = Math.max(...data.byFunction.map((x) => x.count), 1);
                return (
                  <div key={f.label} className="flex items-center gap-3">
                    <span className="w-16 text-sm text-ink-soft">{f.label}</span>
                    <div className="h-2 flex-1 rounded-full bg-black/5">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${(f.count / max) * 100}%`, backgroundColor: brand.base }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm text-muted tabular">{f.count}</span>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage by role</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.byRole} layout="vertical">
              <CartesianGrid stroke="#e7e5e1" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={70} />
              <Tooltip />
              <Bar dataKey="count" fill="#5b6470" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
