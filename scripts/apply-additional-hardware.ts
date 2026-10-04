import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

// Part B5 of the asset-sync routine (see .claude/skills/sync/SKILL.md).
// Reads the raw ServiceNow_Hardware_Assets_Lookup result for a query filtered
// to `u_deployment_type=Additional Hardware^assetTagIN<our known computer tags>`
// — any asset_tag present in that result is, by construction, marked
// Additional Hardware in ServiceNow, so every match gets
// Asset.deploymentType = "ADDITIONAL_HARDWARE" directly (no separate apply
// step needed, unlike Part B3 — there's no "forward lifecycle" ambiguity
// here, just an on/off classification).
//
// Usage: npx tsx scripts/apply-additional-hardware.ts <path-to-raw-result-file>

async function main() {
  const rawPath = process.argv[2];
  if (!rawPath) {
    console.error("Usage: npx tsx scripts/apply-additional-hardware.ts <path-to-raw-result-file>");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(rawPath, "utf-8"));
  const assets = raw?.result?.assets ?? [];
  if (assets.length === 0) {
    console.log("No assets found in the given file — nothing to mark.");
    return;
  }

  const tags: string[] = assets.map((a: { asset_tag: string }) => a.asset_tag);

  const alreadyMarked = await prisma.asset.findMany({
    where: { assetTag: { in: tags }, deploymentType: "ADDITIONAL_HARDWARE" },
    select: { assetTag: true },
  });
  const alreadyMarkedSet = new Set(alreadyMarked.map((a) => a.assetTag));

  const result = await prisma.asset.updateMany({
    where: { assetTag: { in: tags }, deploymentType: { not: "ADDITIONAL_HARDWARE" } },
    data: { deploymentType: "ADDITIONAL_HARDWARE" },
  });

  const notInApp = await prisma.asset.findMany({
    where: { assetTag: { in: tags } },
    select: { assetTag: true },
  });
  const foundTags = new Set(notInApp.map((a) => a.assetTag));
  const unmatched = tags.filter((t) => !foundTags.has(t));

  console.log(`${result.count} asset(s) newly marked ADDITIONAL_HARDWARE.`);
  if (alreadyMarkedSet.size > 0) {
    console.log(`${alreadyMarkedSet.size} already marked (unchanged): ${[...alreadyMarkedSet].join(", ")}`);
  }
  if (unmatched.length > 0) {
    console.log(
      `${unmatched.length} tag(s) from this SNOW batch not found in our Asset table (expected — this batch may include non-TLV/company-wide tags if the query wasn't scoped to our known tags): ${unmatched.join(", ")}`
    );
  }
}

main().finally(() => prisma.$disconnect());
