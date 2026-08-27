import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Step 3 of the asset-sync routine (see .claude/skills/sync/SKILL.md).
// Reads scripts/asset-sync-results.json (the ServiceNow_Hardware_Assets_Lookup
// results for our known tags, shaped per the skill) and scripts/known-assets.json
// (written by export-known-assets.ts), diffs them, and applies conservative
// updates: only "forward" lifecycle transitions, never overwrites a status
// this app already considers terminal, and always logs what it touched vs.
// what it left alone for manual review.

type SnowResult = {
  assetTag: string;
  installStatus: string; // raw ServiceNow code, e.g. "1", "14"
  displayName: string | null;
};

// ServiceNow's display_name is "<asset_tag> - <model>" — the asset tag is
// already shown as its own field in the UI, so strip the redundant prefix
// before storing into `model`.
function modelFromDisplayName(displayName: string, assetTag: string): string {
  const prefix = `${assetTag} - `;
  return displayName.startsWith(prefix) ? displayName.slice(prefix.length) : displayName;
}

type KnownAsset = {
  kind: "ASSET" | "MOBILE";
  id: string;
  employeeId: string;
  assetTag: string | null;
  model: string | null;
  status: string;
};

// ServiceNow install_status -> our forward-only status mapping.
// 1=Deployed, 9=In Transit, 11=Received, 12=In Inventory,
// 13=Pending Disposal, 14=Disposed, 16=Lost
const STATUS_MAP: Record<string, string | null> = {
  "1": "ASSIGNED",
  "9": null, // ambiguous, don't guess
  "11": null,
  "12": "RETURNED",
  "13": "RETURN_REQUESTED",
  "14": "RETURNED",
  "16": "RETURNED",
};

// Statuses this app treats as terminal for each record type — never
// downgraded/overwritten even if ServiceNow still shows Deployed (that just
// means SNOW hasn't caught up with our own offboarding flow yet).
const TERMINAL_ASSET = new Set(["RETURNED"]);
const TERMINAL_MOBILE = new Set(["RETURNED", "BOUGHT_BACK", "PORTED_OUT", "DISCONNECTED"]);

// Only allow moving "forward" in each lifecycle, never backward (e.g. never
// flip RETURN_REQUESTED back to ASSIGNED just because a stale SNOW batch
// still shows Deployed).
const ASSET_ORDER = ["ASSIGNED", "RETURN_REQUESTED", "RETURNED"];
const MOBILE_ORDER = ["PENDING_APPROVAL", "ASSIGNED", "RETURN_REQUESTED", "RETURNED"];

function isForward(order: string[], from: string, to: string): boolean {
  const fromIdx = order.indexOf(from);
  const toIdx = order.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx > fromIdx;
}

async function main() {
  const known: KnownAsset[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, "known-assets.json"), "utf-8")
  );
  const results: SnowResult[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, "asset-sync-results.json"), "utf-8")
  );

  const resultsByTag = new Map(results.map((r) => [r.assetTag, r]));
  const updated: string[] = [];
  const noChange: string[] = [];
  const flagged: string[] = [];
  const notFound: string[] = [];

  for (const k of known) {
    if (!k.assetTag) continue;
    const snow = resultsByTag.get(k.assetTag);
    if (!snow) {
      notFound.push(k.assetTag);
      continue;
    }

    const mapped = STATUS_MAP[snow.installStatus] ?? null;
    const terminal = k.kind === "ASSET" ? TERMINAL_ASSET : TERMINAL_MOBILE;
    const order = k.kind === "ASSET" ? ASSET_ORDER : MOBILE_ORDER;

    const data: Record<string, unknown> = {};
    if (snow.displayName) {
      const cleanModel = modelFromDisplayName(snow.displayName, k.assetTag as string);
      if (cleanModel !== k.model) {
        data.model = cleanModel;
      }
    }

    let statusChanged = false;
    if (mapped && !terminal.has(k.status) && isForward(order, k.status, mapped)) {
      data.status = mapped;
      if (mapped === "RETURNED") {
        if (k.kind === "ASSET") data.returnedAt = new Date();
        else data.resolvedAt = new Date();
      }
      statusChanged = true;
    } else if (mapped && mapped !== k.status && !isForward(order, k.status, mapped)) {
      // SNOW disagrees but not in a direction we auto-apply — needs eyes.
      flagged.push(`${k.assetTag}: ours=${k.status}, SNOW install_status=${snow.installStatus} (${mapped ?? "unmapped"}) — not auto-applied`);
    }

    if (Object.keys(data).length === 0) {
      noChange.push(k.assetTag);
      continue;
    }

    if (k.kind === "ASSET") {
      await prisma.asset.update({ where: { id: k.id }, data });
    } else {
      await prisma.mobileDevice.update({ where: { id: k.id }, data });
    }
    updated.push(`${k.assetTag}: ${JSON.stringify(data)}${statusChanged ? "" : " (model only)"}`);
  }

  console.log(`\n${updated.length} record(s) updated:`);
  updated.forEach((u) => console.log(`  ${u}`));
  console.log(`\n${flagged.length} flagged for manual review (not auto-applied):`);
  flagged.forEach((f) => console.log(`  ${f}`));
  console.log(`\n${notFound.length} known tag(s) not present in this SNOW batch (may just be outside the queried batches):`);
  notFound.forEach((t) => console.log(`  ${t}`));
  console.log(`\n${noChange.length} record(s) unchanged.`);
}

main().finally(() => prisma.$disconnect());
