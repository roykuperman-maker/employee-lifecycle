import { prisma } from "@/lib/db";
import { fetchExitProcessRecords } from "@/lib/quickbase";

// Upserts by QuickBase's own Record ID# — safe to re-run on a schedule,
// always reflects QuickBase's current state. `r` only carries QuickBase
// fields, so `cancelled` (the one local-only field) is never included in
// `update` and is left alone by Prisma — it survives repeated syncs.
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
