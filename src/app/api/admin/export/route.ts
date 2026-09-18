import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const conditions = [];
  if (start) conditions.push(gte(bookings.date, start));
  if (end) conditions.push(lte(bookings.date, end));

  const rows = await db.query.bookings.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    with: { person: { with: { role: true, function: true } }, room: true },
    orderBy: (t, { asc }) => [asc(t.date), asc(t.startTime)],
  });

  const header = [
    "Booking Code", "Name", "Role", "Function", "Room",
    "Date", "Start", "End", "Status", "Checked In At", "Checked Out At",
  ];

  const csvRows = rows.map((b) =>
    [
      b.bookingCode, b.person.name, b.person.role.label, b.person.function.label, b.room.name,
      b.date, b.startTime.slice(0, 5), b.endTime.slice(0, 5), b.status,
      b.actualCheckInAt ? new Date(b.actualCheckInAt).toISOString() : "",
      b.actualCheckOutAt ? new Date(b.actualCheckOutAt).toISOString() : "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );

  const csv = [header.join(","), ...csvRows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="bookings-export.csv"`,
    },
  });
}
