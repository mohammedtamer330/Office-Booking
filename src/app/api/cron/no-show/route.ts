import { NextRequest, NextResponse } from "next/server";
import { sweepNoShows } from "@/lib/booking/lifecycle";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const marked = await sweepNoShows();
  return NextResponse.json({ ok: true, marked });
}
