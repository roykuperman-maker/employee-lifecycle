import { NextRequest, NextResponse } from "next/server";
import { runDailyChecks } from "@/lib/jobs";

// Vercel Cron Jobs issue a GET request, authenticated with a bearer token
// matching CRON_SECRET (Vercel attaches this automatically when the env var
// is set) — this keeps the endpoint from being triggered by anyone who finds
// the URL. The dashboard's manual "Run daily checks now" button uses POST
// instead and is intentionally left unauthenticated (same-origin, user-clicked).
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  await runDailyChecks();
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString() });
}

export async function POST() {
  await runDailyChecks();
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString() });
}
