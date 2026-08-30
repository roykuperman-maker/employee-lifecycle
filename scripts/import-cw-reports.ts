// Imports contingent-worker end dates parsed from Reut Arieli's periodic
// "CW(s) updated report" / "CW Engagement Data Report" emails
// (reut_arieli@intuit.com) into the same Exit Processes list as the
// QuickBase-sourced FTE terminations. Only the worker name + end date are
// captured — per Roy, that's all this source is needed for.
//
// Run this as part of /sync: search Gmail for the latest such email
// (`from:reut_arieli@intuit.com "CW" report`, or similar — subject wording
// has varied: "IL CWs January 2026 Report", "CWs updated report, March
// 2026", "CW updated Engagement Data Report"), take the MOST RECENT thread
// (later reports supersede earlier ones — the same workers reappear with
// updated end dates), parse its table (Manager / Worker / Start Date /
// Est. End Date [/ Job Title]) into {employeeName, terminationDate} pairs
// (name converted from "Last, First" to "First Last"), overwrite
// scripts/cw-report-data.json with the fresh array, then run this script.
import { PrismaClient } from "@prisma/client";
import cwReports from "./cw-report-data.json";

const prisma = new PrismaClient();

async function main() {
  for (const r of cwReports) {
    await prisma.exitProcess.upsert({
      where: { employeeName_source: { employeeName: r.employeeName, source: "CW_REPORT" } },
      create: {
        employeeName: r.employeeName,
        terminationDate: new Date(r.terminationDate),
        source: "CW_REPORT",
      },
      update: {
        terminationDate: new Date(r.terminationDate),
      },
    });
  }
  console.log(`Synced ${cwReports.length} CW report record(s).`);
}

main().finally(() => prisma.$disconnect());
