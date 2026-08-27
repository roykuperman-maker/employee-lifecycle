import fs from "node:fs";
import { prisma } from "../src/lib/db";

async function main() {
  const taggable: { employeeId: string; fullName: string; assetTag: string }[] = JSON.parse(
    fs.readFileSync("/tmp/snow-taggable.json", "utf-8")
  );
  const jobFunctionByTag: Record<string, string> = JSON.parse(
    fs.readFileSync("/tmp/snow-jobfunction-map.json", "utf-8")
  );

  let updatedFTE = 0;
  let updatedCW = 0;
  let notFoundInSnow = 0;

  for (const { employeeId, assetTag } of taggable) {
    const jobFunction = jobFunctionByTag[assetTag];
    if (!jobFunction) {
      notFoundInSnow++;
      continue;
    }
    const employeeType = jobFunction === "Contingent Workers" ? "CW" : "FTE";

    // Guard against a stale row (employee's type was set by something else
    // since prep-snow-lookup.ts ran) — only overwrite if still null.
    const current = await prisma.employee.findUnique({ where: { id: employeeId }, select: { employeeType: true } });
    if (!current || current.employeeType !== null) continue;

    await prisma.employee.update({
      where: { id: employeeId },
      data: { employeeType },
    });
    if (employeeType === "FTE") updatedFTE++;
    else updatedCW++;
  }

  console.log("--- Employee Type backfill from ServiceNow ---");
  console.log("Set to FTE:", updatedFTE);
  console.log("Set to CW:", updatedCW);
  console.log("Not found in SNOW (left blank):", notFoundInSnow);

  const stillNull = await prisma.employee.count({ where: { employeeType: null } });
  console.log("Employees still with unknown type:", stillNull);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
