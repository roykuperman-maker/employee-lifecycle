import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { prisma } from "../src/lib/db";

const CSV_PATH = "/Users/rkuperman/Downloads/alm_asset (2).csv";

function normName(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.toString().trim().toLowerCase().replace(/-inactive$/i, "").trim();
}

async function main() {
  const csvText = fs.readFileSync(CSV_PATH, "utf-8");
  const csvRows: { assigned_to: string; asset_tag: string; model_category: string }[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
  });

  const mobileTagByName = new Map<string, string>();
  for (const row of csvRows) {
    if (row.model_category === "Handheld Devices" || row.model_category === "Communication Device") {
      const key = normName(row.assigned_to);
      if (key && !mobileTagByName.has(key)) mobileTagByName.set(key, row.asset_tag);
    }
  }

  const employees = await prisma.employee.findMany({
    where: { employeeType: null },
    include: { assets: true },
  });

  const taggable: { employeeId: string; fullName: string; assetTag: string }[] = [];
  const nameOnly: { employeeId: string; fullName: string }[] = [];

  for (const emp of employees) {
    if (emp.assets.length > 0) {
      taggable.push({ employeeId: emp.id, fullName: emp.fullName, assetTag: emp.assets[0].assetTag });
      continue;
    }
    const tag = mobileTagByName.get(normName(emp.fullName)!);
    if (tag) {
      taggable.push({ employeeId: emp.id, fullName: emp.fullName, assetTag: tag });
    } else {
      nameOnly.push({ employeeId: emp.id, fullName: emp.fullName });
    }
  }

  console.log(`employeeType-null total: ${employees.length}`);
  console.log(`taggable (has a known asset tag): ${taggable.length}`);
  console.log(`name-only (no asset tag anywhere): ${nameOnly.length}`);

  fs.writeFileSync("/tmp/snow-taggable.json", JSON.stringify(taggable, null, 2));
  fs.writeFileSync("/tmp/snow-nameonly.json", JSON.stringify(nameOnly, null, 2));

  await prisma.$disconnect();
}

main();
