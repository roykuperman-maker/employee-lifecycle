import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { prisma } from "../src/lib/db";

const CSV_PATH = "/Users/rkuperman/Downloads/alm_asset (2).csv";

function normName(name: string | null | undefined): string | null {
  if (!name) return null;
  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/-inactive$/i, "")
    .trim();
}

async function main() {
  const csvText = fs.readFileSync(CSV_PATH, "utf-8");
  const csvRows: { assigned_to: string; asset_tag: string; model_category: string }[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
  });

  const mobileTagsByName = new Map<string, string[]>();
  for (const row of csvRows) {
    if (row.model_category === "Handheld Devices" || row.model_category === "Communication Device") {
      const key = normName(row.assigned_to)!;
      if (!mobileTagsByName.has(key)) mobileTagsByName.set(key, []);
      mobileTagsByName.get(key)!.push(row.asset_tag);
    }
  }

  const employees = await prisma.employee.findMany({
    include: { mobileDevices: { orderBy: { createdAt: "asc" } } },
  });

  let updated = 0;
  let skippedNoMatch = 0;
  let skippedAlreadySet = 0;
  let skippedCountMismatch = 0;

  for (const emp of employees) {
    const tags = mobileTagsByName.get(normName(emp.fullName)!);
    if (!tags) {
      skippedNoMatch += emp.mobileDevices.length;
      continue;
    }
    // Import created one MobileDevice per CSV row, in the same file order,
    // only when mobileRows.length > 0 (the xlsx-only fallback path is
    // mutually exclusive with having CSV rows at all) — so a straight
    // index-for-index zip against createdAt order is safe IF the counts
    // still match (i.e. nothing has been added/removed by hand since import).
    if (tags.length !== emp.mobileDevices.length) {
      skippedCountMismatch += emp.mobileDevices.length;
      continue;
    }
    for (let i = 0; i < tags.length; i++) {
      const device = emp.mobileDevices[i];
      if (device.assetTag) {
        skippedAlreadySet++;
        continue;
      }
      await prisma.mobileDevice.update({
        where: { id: device.id },
        data: { assetTag: tags[i] },
      });
      updated++;
    }
  }

  console.log("--- Mobile asset tag backfill ---");
  console.log("Updated:", updated);
  console.log("Skipped (already had a tag):", skippedAlreadySet);
  console.log("Skipped (no CSV match for this employee, e.g. xlsx-only):", skippedNoMatch);
  console.log("Skipped (device count mismatch vs CSV, needs manual review):", skippedCountMismatch);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
