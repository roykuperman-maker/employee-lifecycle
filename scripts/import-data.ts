import fs from "node:fs";
import { prisma } from "../src/lib/db";

// Run this AFTER schema.prisma's datasource has been switched to postgresql,
// migrations applied to the new database, and DATABASE_URL points at it.
// Reads the JSON dump produced by export-data.ts and recreates every row,
// preserving original ids so relations (employeeId foreign keys) stay intact.
async function main() {
  const dumpPath = "/Users/rkuperman/Emplyee lifecycle/data-export.json";
  const dump = JSON.parse(fs.readFileSync(dumpPath, "utf-8"));

  const existing = await prisma.employee.count();
  if (existing > 0) {
    console.error(`Target database already has ${existing} employees — refusing to import on top of existing data.`);
    process.exit(1);
  }

  await prisma.employee.createMany({ data: dump.employees });
  await prisma.asset.createMany({ data: dump.assets });
  await prisma.mobileDevice.createMany({ data: dump.mobileDevices });
  await prisma.lineForm.createMany({ data: dump.lineForms });
  await prisma.notification.createMany({ data: dump.notifications });

  console.log("Imported:");
  console.log("  employees:", dump.employees.length);
  console.log("  assets:", dump.assets.length);
  console.log("  mobileDevices:", dump.mobileDevices.length);
  console.log("  lineForms:", dump.lineForms.length);
  console.log("  notifications:", dump.notifications.length);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
