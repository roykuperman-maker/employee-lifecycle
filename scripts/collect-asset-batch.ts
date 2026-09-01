import fs from "fs";
import path from "path";

// Step 2 of the asset-sync routine (see .claude/skills/sync/SKILL.md).
// A ServiceNow_Hardware_Assets_Lookup batch of 100 asset tags is large
// enough that its result always gets written to a file instead of returned
// inline — this script reads that raw file and appends the 3 fields we
// actually need ({assetTag, installStatus, displayName}) to
// scripts/asset-sync-results.json. No manual transcription of tool output
// required; run this once per batch file, then move on to the next batch.
//
// Usage: npx tsx scripts/collect-asset-batch.ts <path-to-raw-result-file>

const RESULTS_PATH = path.join(__dirname, "asset-sync-results.json");

function main() {
  const rawPath = process.argv[2];
  if (!rawPath) {
    console.error("Usage: npx tsx scripts/collect-asset-batch.ts <path-to-raw-result-file>");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(rawPath, "utf-8"));
  const assets = raw?.result?.assets ?? [];
  if (assets.length === 0) {
    console.log("No assets found in the given file — nothing to add.");
    return;
  }

  const existing: { assetTag: string; installStatus: string; displayName: string | null }[] =
    fs.existsSync(RESULTS_PATH) ? JSON.parse(fs.readFileSync(RESULTS_PATH, "utf-8")) : [];

  const byTag = new Map(existing.map((r) => [r.assetTag, r]));
  for (const a of assets) {
    byTag.set(a.asset_tag, {
      assetTag: a.asset_tag,
      installStatus: a.install_status,
      displayName: a.display_name ?? null,
    });
  }

  const combined = Array.from(byTag.values());
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(combined, null, 2));
  console.log(`Added/updated ${assets.length} record(s) from this batch. Total in asset-sync-results.json: ${combined.length}.`);
}

main();
