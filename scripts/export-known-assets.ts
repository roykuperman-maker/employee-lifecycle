import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Step 1 of the asset-sync routine (see .claude/skills/sync/SKILL.md).
// Dumps every asset tag this app already tracks, then prints them as
// ready-to-run ServiceNow_Hardware_Assets_Lookup sysparm_query strings in
// batches (OR-chained asset_tag matches — that tool has no "IN" operator).
// Also writes known-assets.json, which apply-asset-sync.ts diffs against.

const BATCH_SIZE = 25;

async function main() {
  const assets = await prisma.asset.findMany({
    select: { id: true, employeeId: true, assetTag: true, model: true, status: true },
  });
  const mobiles = await prisma.mobileDevice.findMany({
    where: { assetTag: { not: null } },
    select: { id: true, employeeId: true, assetTag: true, model: true, status: true },
  });

  const isRealTag = (tag: string | null) => !!tag && tag.toUpperCase() !== "UNKNOWN";

  const known = [
    ...assets.filter((a) => isRealTag(a.assetTag)).map((a) => ({ kind: "ASSET" as const, ...a })),
    ...mobiles.filter((m) => isRealTag(m.assetTag)).map((m) => ({ kind: "MOBILE" as const, ...m })),
  ];

  fs.writeFileSync(
    path.join(__dirname, "known-assets.json"),
    JSON.stringify(known, null, 2)
  );

  const tags = known.map((k) => k.assetTag as string);
  console.log(`${known.length} known asset tags written to scripts/known-assets.json`);
  console.log(`Run these ${Math.ceil(tags.length / BATCH_SIZE)} queries via ServiceNow_Hardware_Assets_Lookup (sysparm_limit=${BATCH_SIZE}):\n`);

  for (let i = 0; i < tags.length; i += BATCH_SIZE) {
    const batch = tags.slice(i, i + BATCH_SIZE);
    const query = batch.map((t) => `asset_tag=${t}`).join("^OR");
    console.log(`--- batch ${i / BATCH_SIZE + 1} ---`);
    console.log(query);
    console.log();
  }
}

main().finally(() => prisma.$disconnect());
