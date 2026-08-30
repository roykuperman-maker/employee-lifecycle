import { NextRequest, NextResponse } from "next/server";
import { syncExitProcesses } from "@/lib/exitProcessSync";

// Same auth pattern as the other job routes: Vercel Cron authenticates via
// CRON_SECRET bearer token; the dashboard's manual "Sync now" button POSTs
// unauthenticated (same-origin, user-clicked).
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const result = await syncExitProcesses();
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...result });
}

export async function POST() {
  const result = await syncExitProcesses();
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...result });
}
