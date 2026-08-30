import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/Badge";
import { RunDailyButton } from "@/components/RunDailyButton";

export const dynamic = "force-dynamic";

const DEPT_COLUMNS = [
  { key: "managerTabStatus", label: "Manager" },
  { key: "itTabStatus", label: "IT" },
  { key: "financeTabStatus", label: "Finance" },
  { key: "payrollTabStatus", label: "Payroll" },
  { key: "relocationTabStatus", label: "Relocation" },
  { key: "benefitsTabStatus", label: "Benefits" },
  { key: "securityTabStatus", label: "Security" },
  { key: "hrTabStatus", label: "HR" },
] as const;

const SORTABLE_COLUMNS = {
  employeeName: "Employee",
  source: "Source",
  jobTitle: "Job Title",
  managerName: "Manager",
  terminationDate: "Termination Date",
  exitType: "Exit Type",
  exitProcessStatus: "Status",
} as const;

type SortKey = keyof typeof SORTABLE_COLUMNS;

function isSortKey(value: string | undefined): value is SortKey {
  return !!value && value in SORTABLE_COLUMNS;
}

export default async function ExitProcessesPage({
  searchParams,
}: {
  searchParams: { sort?: string; dir?: string };
}) {
  const sortKey: SortKey = isSortKey(searchParams.sort) ? searchParams.sort : "terminationDate";
  const sortDir: "asc" | "desc" = searchParams.dir === "asc" ? "asc" : "desc";

  const exitProcesses = await prisma.exitProcess.findMany({
    // FTEs (source QUICKBASE) whose IT offboarding is already done are
    // noise for Roy's day-to-day view — hide them. CW rows have no IT
    // tab status at all, so they're always shown.
    where: {
      OR: [{ source: { not: "QUICKBASE" } }, { itTabStatus: { not: "Completed" } }],
    },
    orderBy: { [sortKey]: sortDir },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Exit Processes</h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-400">
            FTEs synced from QuickBase (refreshes daily, or on demand) — CWs from Reut Arieli's periodic
            report emails (imported during /sync).
          </p>
          <RunDailyButton endpoint="/api/jobs/sync-exit-processes" label="Sync now" />
        </div>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        {exitProcesses.length} exit process{exitProcesses.length === 1 ? "" : "es"}
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {Object.entries(SORTABLE_COLUMNS).map(([key, label]) => {
                const isActive = sortKey === key;
                const nextDir = isActive && sortDir === "asc" ? "desc" : "asc";
                return (
                  <th key={key} className="px-4 py-3">
                    <Link
                      href={`/exit-processes?sort=${key}&dir=${nextDir}`}
                      className={`flex items-center gap-1 hover:text-slate-900 ${isActive ? "text-slate-900" : ""}`}
                    >
                      {label}
                      {isActive && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                    </Link>
                  </th>
                );
              })}
              {DEPT_COLUMNS.map((c) => (
                <th key={c.key} className="px-4 py-3">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exitProcesses.map((e) => (
              <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  <div>{e.employeeName}</div>
                  {e.employeeEmail && <div className="text-xs font-normal text-slate-400">{e.employeeEmail}</div>}
                </td>
                <td className="px-4 py-3">
                  <Badge value={e.source === "CW_REPORT" ? "CW" : "FTE"} />
                </td>
                <td className="px-4 py-3 text-slate-500">{e.jobTitle || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{e.managerName || "—"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {e.terminationDate ? new Date(e.terminationDate).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">{e.exitType || "—"}</td>
                <td className="px-4 py-3">{e.exitProcessStatus ? <Badge value={e.exitProcessStatus} /> : "—"}</td>
                {DEPT_COLUMNS.map((c) => {
                  const value = e[c.key as keyof typeof e] as string | null;
                  return (
                    <td key={c.key} className="px-4 py-3">
                      {value ? <Badge value={value} /> : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
            {exitProcesses.length === 0 && (
              <tr>
                <td colSpan={7 + DEPT_COLUMNS.length} className="px-4 py-8 text-center text-slate-400">
                  No exit processes synced yet — click "Sync now" above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
