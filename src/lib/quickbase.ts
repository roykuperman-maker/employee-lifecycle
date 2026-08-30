const REALM = "intuitcorp.quickbase.com";
const EXIT_PROCESS_TABLE_ID = "bthkztm8f";

// Field IDs in the "Exit Process" table (intuitcorp.quickbase.com, app
// bthkztm8b). "Manager" (50) is the populated manager user field in
// practice — "Manager Name" (13) / "Manager Email" (42) are legacy/unused
// duplicates that come back null on real records.
const FIELDS = {
  recordId: 3,
  employeeName: 6,
  employeeEmail: 36,
  jobTitle: 346,
  manager: 50,
  terminationDate: 8,
  exitType: 203,
  exitProcessStatus: 120,
  managerTabStatus: 363,
  itTabStatus: 364,
  financeTabStatus: 365,
  payrollTabStatus: 366,
  relocationTabStatus: 368,
  benefitsTabStatus: 371,
  securityTabStatus: 372,
  hrTabStatus: 375,
} as const;

type QbUserValue = { email?: string; id?: string; name?: string } | null;

interface QbRecord {
  [fieldId: string]: { value: unknown };
}

export interface ExitProcessRecord {
  quickbaseRecordId: number;
  employeeName: string;
  employeeEmail: string | null;
  jobTitle: string | null;
  managerName: string | null;
  managerEmail: string | null;
  terminationDate: Date | null;
  exitType: string | null;
  exitProcessStatus: string | null;
  managerTabStatus: string | null;
  itTabStatus: string | null;
  financeTabStatus: string | null;
  payrollTabStatus: string | null;
  relocationTabStatus: string | null;
  benefitsTabStatus: string | null;
  securityTabStatus: string | null;
  hrTabStatus: string | null;
}

function str(record: QbRecord, fieldId: number): string | null {
  const v = record[String(fieldId)]?.value;
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function date(record: QbRecord, fieldId: number): Date | null {
  const v = str(record, fieldId);
  return v ? new Date(v) : null;
}

function userField(record: QbRecord, fieldId: number): QbUserValue {
  const v = record[String(fieldId)]?.value;
  return v && typeof v === "object" ? (v as QbUserValue) : null;
}

// Fetches every row of the Exit Process table. QuickBase's query API paginates
// at 1000 records/page by default, well above this table's ~175 rows, but the
// loop is kept in case that grows.
export async function fetchExitProcessRecords(): Promise<ExitProcessRecord[]> {
  const token = process.env.QUICKBASE_USER_TOKEN;
  if (!token) throw new Error("QUICKBASE_USER_TOKEN is not set");

  const select = Object.values(FIELDS);
  const results: ExitProcessRecord[] = [];
  let skip = 0;

  while (true) {
    const res = await fetch("https://api.quickbase.com/v1/records/query", {
      method: "POST",
      headers: {
        "QB-Realm-Hostname": REALM,
        Authorization: `QB-USER-TOKEN ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EXIT_PROCESS_TABLE_ID,
        select,
        options: { top: 1000, skip },
      }),
    });
    if (!res.ok) throw new Error(`QuickBase query failed: ${res.status} ${await res.text()}`);
    const body = await res.json();
    const records: QbRecord[] = body.data ?? [];

    for (const r of records) {
      const employeeUser = userField(r, FIELDS.employeeName);
      const managerUser = userField(r, FIELDS.manager);
      results.push({
        quickbaseRecordId: Number(r[String(FIELDS.recordId)]?.value),
        employeeName: employeeUser?.name || "(name not on file)",
        employeeEmail: employeeUser?.email || str(r, FIELDS.employeeEmail),
        jobTitle: str(r, FIELDS.jobTitle),
        managerName: managerUser?.name ?? null,
        managerEmail: managerUser?.email ?? null,
        terminationDate: date(r, FIELDS.terminationDate),
        exitType: str(r, FIELDS.exitType),
        exitProcessStatus: str(r, FIELDS.exitProcessStatus),
        managerTabStatus: str(r, FIELDS.managerTabStatus),
        itTabStatus: str(r, FIELDS.itTabStatus),
        financeTabStatus: str(r, FIELDS.financeTabStatus),
        payrollTabStatus: str(r, FIELDS.payrollTabStatus),
        relocationTabStatus: str(r, FIELDS.relocationTabStatus),
        benefitsTabStatus: str(r, FIELDS.benefitsTabStatus),
        securityTabStatus: str(r, FIELDS.securityTabStatus),
        hrTabStatus: str(r, FIELDS.hrTabStatus),
      });
    }

    const totalRecords = body.metadata?.totalRecords ?? records.length;
    skip += records.length;
    if (records.length === 0 || skip >= totalRecords) break;
  }

  return results;
}
