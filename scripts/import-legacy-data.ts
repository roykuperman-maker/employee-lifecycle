import fs from "node:fs";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { prisma } from "../src/lib/db";

const CSV_PATH = "/Users/rkuperman/Downloads/alm_asset (2).csv";
const XLSX_PATH = "/Users/rkuperman/Downloads/Mobile devices list (2).xlsx";

type CsvRow = {
  asset_tag: string;
  model: string;
  install_status: string;
  assigned_to: string;
  serial_number: string;
  model_category: string;
  u_refresh_date: string;
  purchase_date: string;
  warranty_expiration: string;
};

type XlsxRow = Record<string, unknown>;

function normName(name: string | null | undefined): string | null {
  if (!name) return null;
  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/-inactive$/i, "")
    .trim();
}

function isInactive(name: string): boolean {
  return /-inactive$/i.test(name.trim());
}

function stripInactiveSuffix(name: string): string {
  return name.replace(/-inactive$/i, "").trim();
}

function classifyComputerType(model: string): string | null {
  const m = model.toLowerCase();
  const isMac = m.includes("mac");
  if (isMac && m.includes("16")) return "MACBOOK_PRO_16";
  if (isMac && m.includes("14")) return "MACBOOK_PRO_14";
  if (m.includes("p1")) return "LENOVO_P1";
  if (m.includes("t14")) return "LENOVO_T14";
  return null;
}

// CSV dates are MM-DD-YYYY (verified against the full dataset: 300 rows have
// day-of-month > 12, zero have month > 12).
function parseCsvDate(value: string): Date | null {
  if (!value) return null;
  const [mm, dd, yyyy] = value.split("-").map(Number);
  if (!mm || !dd || !yyyy) return null;
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

function parseXlsxDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  return null;
}

function toStr(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value).trim();
}

function mapXlsxMobileStatus(status: unknown): string {
  if (status === "To Disconnect") return "RETURN_REQUESTED";
  return "ASSIGNED"; // Active, Suspended (still deployed), or unknown
}

async function main() {
  const today = new Date();

  // ---- Load CSV (authoritative hardware: computers + mobile) ----
  const csvText = fs.readFileSync(CSV_PATH, "utf-8");
  const csvRows: CsvRow[] = parse(csvText, { columns: true, skip_empty_lines: true });

  const computerRowsByName = new Map<string, CsvRow[]>();
  const mobileRowsByName = new Map<string, CsvRow[]>();
  let skippedOther = 0;

  for (const row of csvRows) {
    const key = normName(row.assigned_to);
    if (!key) continue;

    if (row.model_category === "computer") {
      if (!computerRowsByName.has(key)) computerRowsByName.set(key, []);
      computerRowsByName.get(key)!.push(row);
    } else if (row.model_category === "Handheld Devices" || row.model_category === "Communication Device") {
      if (!mobileRowsByName.has(key)) mobileRowsByName.set(key, []);
      mobileRowsByName.get(key)!.push(row);
    } else {
      skippedOther++; // Network Gear / Video Equipment — out of scope
    }
  }

  // ---- Load xlsx (supplementary mobile-line tracker) ----
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: true });
  const ws = wb.Sheets["Mobile devices list"];
  const xlsxRows: XlsxRow[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  const xlsxByName = new Map<string, XlsxRow>();
  for (const row of xlsxRows) {
    const key = normName(row["End User"] as string);
    if (key && !xlsxByName.has(key)) xlsxByName.set(key, row);
  }

  // ---- Union of all employee names ----
  const csvNames = new Set([...computerRowsByName.keys(), ...mobileRowsByName.keys()]);
  const allNames = new Set([...csvNames, ...xlsxByName.keys()]);

  // ---- Skip employees that already exist (idempotent re-run) ----
  const existing = await prisma.employee.findMany({ select: { fullName: true } });
  const existingNames = new Set(existing.map((e) => e.fullName.trim().toLowerCase()));

  let employeesCreated = 0;
  let computersCreated = 0;
  let mobilesCreated = 0;
  let employeesSkippedExisting = 0;
  const unmatchedCsvOnly: string[] = [];
  const unmatchedXlsxOnly: string[] = [];

  for (const key of allNames) {
    if (existingNames.has(key)) {
      employeesSkippedExisting++;
      continue;
    }

    const xlsx = xlsxByName.get(key);
    const computerRows = computerRowsByName.get(key) ?? [];
    const mobileRows = mobileRowsByName.get(key) ?? [];

    // Figure out a display name: prefer xlsx "End User" casing, else the CSV
    // assigned_to (from whichever CSV list has it) with "-INACTIVE" stripped.
    // The "-INACTIVE" flag itself always comes from the CSV name when present,
    // regardless of which source supplies the display casing.
    const rawCsvName = (computerRows[0] ?? mobileRows[0])?.assigned_to;
    const inactive = rawCsvName ? isInactive(rawCsvName) : false;
    const fullName = xlsx ? String(xlsx["End User"]).trim() : stripInactiveSuffix(rawCsvName!);

    if (computerRows.length === 0 && mobileRows.length === 0) unmatchedXlsxOnly.push(fullName);
    if (!xlsx) unmatchedCsvOnly.push(fullName);

    const intuitEmail = toStr(xlsx?.["Email Address"]);
    const managerName = toStr(xlsx?.["Direct Manager"]);
    const employeeType = toStr(xlsx?.["Employee Type"]);
    const xlsxPhone = toStr(xlsx?.["Mobile Phone Number"]);

    const employee = await prisma.employee.create({
      data: {
        fullName,
        intuitEmail,
        managerName,
        employeeType,
        status: inactive ? "OFFBOARDING" : "ACTIVE",
        phoneNumber: mobileRows.length <= 1 ? xlsxPhone : null,
      },
    });
    employeesCreated++;

    for (const row of computerRows) {
      const refreshEligibleDate = parseCsvDate(row.u_refresh_date);
      await prisma.asset.create({
        data: {
          employeeId: employee.id,
          computerType: classifyComputerType(row.model),
          model: row.model,
          assetTag: row.asset_tag,
          assignedDate: parseCsvDate(row.purchase_date) ?? today,
          status: "ASSIGNED",
          refreshEligibleDate,
          refreshStatus: refreshEligibleDate && refreshEligibleDate <= today ? "ELIGIBLE_AWAITING_ACTION" : "NOT_ELIGIBLE",
        },
      });
      computersCreated++;
    }

    for (const row of mobileRows) {
      const refreshEligibleDate = parseCsvDate(row.u_refresh_date);
      await prisma.mobileDevice.create({
        data: {
          employeeId: employee.id,
          phoneNumber: mobileRows.length === 1 ? xlsxPhone : null,
          model: row.model,
          assignedDate: parseCsvDate(row.purchase_date) ?? today,
          status: "ASSIGNED",
          refreshEligibleDate,
          refreshStatus: refreshEligibleDate && refreshEligibleDate <= today ? "ELIGIBLE_AWAITING_ACTION" : "NOT_ELIGIBLE",
        },
      });
      mobilesCreated++;
    }

    // xlsx-only employee (no CSV hardware row at all): create one mobile
    // device from the tracker fields alone.
    if (mobileRows.length === 0 && xlsx) {
      const refreshEligibleDate = parseXlsxDate(xlsx["Refresh date"]);
      await prisma.mobileDevice.create({
        data: {
          employeeId: employee.id,
          phoneNumber: xlsxPhone,
          model: toStr(xlsx["Mobile Device Type"]),
          status: mapXlsxMobileStatus(xlsx["Status"]),
          refreshEligibleDate,
          refreshStatus: refreshEligibleDate && refreshEligibleDate <= today ? "ELIGIBLE_AWAITING_ACTION" : "NOT_ELIGIBLE",
        },
      });
      mobilesCreated++;
    }

    // The 3 xlsx rows with an "Equipment type" (laptop entitlement) but no
    // matching CSV computer row at all — the only computer signal we have.
    if (computerRows.length === 0 && xlsx?.["Equipment type"]) {
      const eqType = toStr(xlsx["Equipment type"])!;
      await prisma.asset.create({
        data: {
          employeeId: employee.id,
          computerType: classifyComputerType(eqType),
          model: eqType,
          assetTag: "UNKNOWN",
          assignedDate: today,
          status: "ASSIGNED",
        },
      });
      computersCreated++;
    }
  }

  console.log("--- Import summary ---");
  console.log("Employees created:", employeesCreated);
  console.log("Employees skipped (already existed):", employeesSkippedExisting);
  console.log("Computers created:", computersCreated);
  console.log("Mobile devices created:", mobilesCreated);
  console.log("CSV rows skipped (Network Gear / Video Equipment):", skippedOther);
  console.log("CSV-only employees (no xlsx tracker row):", unmatchedCsvOnly.length);
  console.log("xlsx-only employees (no CSV hardware row):", unmatchedXlsxOnly.length);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
