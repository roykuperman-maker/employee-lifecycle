import { prisma } from "@/lib/db";
import { fetchExitProcessRecords } from "@/lib/quickbase";

// Upserts by QuickBase's own Record ID# — safe to re-run on a schedule,
// always reflects QuickBase's current state (no local-only fields to
// clobber, unlike the ServiceNow Ticket sync).
export async function syncExitProcesses() {
  const records = await fetchExitProcessRecords();

  for (const r of records) {
    await prisma.exitProcess.upsert({
      where: { quickbaseRecordId: r.quickbaseRecordId },
      create: r,
      update: r,
    });
  }

  return { synced: records.length };
}
