import fs from "node:fs";
import { prisma } from "../src/lib/db";

// One-time export of the current SQLite data, taken before switching the
// Prisma datasource provider to Postgres for the Vercel migration. Prisma's
// generated client is provider-specific, so we can't read SQLite and write
// Postgres from the same client — export now, import later against the new
// provider's generated client.
async function main() {
  const [employees, assets, mobileDevices, lineForms, notifications] = await Promise.all([
    prisma.employee.findMany(),
    prisma.asset.findMany(),
    prisma.mobileDevice.findMany(),
    prisma.lineForm.findMany(),
    prisma.notification.findMany(),
  ]);

  const dump = { employees, assets, mobileDevices, lineForms, notifications };
  const outPath = "/Users/rkuperman/Emplyee lifecycle/data-export.json";
  fs.writeFileSync(outPath, JSON.stringify(dump, null, 2));

  console.log("Exported:");
  console.log("  employees:", employees.length);
  console.log("  assets:", assets.length);
  console.log("  mobileDevices:", mobileDevices.length);
  console.log("  lineForms:", lineForms.length);
  console.log("  notifications:", notifications.length);
  console.log("Written to:", outPath);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
