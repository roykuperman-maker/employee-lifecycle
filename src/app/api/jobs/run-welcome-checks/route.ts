import { NextRequest, NextResponse } from "next/server";
import { runWelcomeChecks } from "@/lib/jobs";

// See src/app/api/jobs/run-daily/route.ts for the auth pattern — same idea,
// separate cron entry because this needs to fire at 11am Israel time instead
// of 8am.
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  await runWelcomeChecks();
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString() });
}

export async function POST() {
  await runWelcomeChecks();
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString() });
}
