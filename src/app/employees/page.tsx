import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/Badge";

export const dynamic = "force-dynamic";

const SORTABLE_COLUMNS = {
  fullName: "Name",
  employeeType: "Type",
  status: "Status",
  employmentStartDate: "Start Date",
  computerCount: "Computers",
  mobileCount: "Mobile",
} as const;

type SortKey = keyof typeof SORTABLE_COLUMNS;

function isSortKey(value: string | undefined): value is SortKey {
  return !!value && value in SORTABLE_COLUMNS;
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; q?: string; sort?: string; dir?: string };
}) {
  const where: Record<string, unknown> = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.type) where.employeeType = searchParams.type;

  const q = searchParams.q?.trim();
  if (q) {
    // mode: "insensitive" matters here — Postgres's LIKE (what `contains`
    // compiles to) is case-sensitive, unlike SQLite's default LIKE which
    // this app briefly ran on before the Vercel/Postgres migration.
    const ci = { contains: q, mode: "insensitive" as const };
    where.OR = [
      { fullName: ci },
      { intuitEmail: ci },
      { phoneNumber: ci },
      { managerName: ci },
      { assets: { some: { OR: [{ assetTag: ci }, { model: ci }] } } },
      {
        mobileDevices: {
          some: { OR: [{ assetTag: ci }, { phoneNumber: ci }, { model: ci }, { simNumber: ci }] },
        },
      },
    ];
  }

  const employees = await prisma.employee.findMany({
    where,
    include: { assets: true, mobileDevices: true },
    orderBy: { createdAt: "desc" },
  });

  const sortKey: SortKey = isSortKey(searchParams.sort) ? searchParams.sort : "fullName";
  const sortDir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";
  const mobileCount = (e: (typeof employees)[number]) =>
    e.mobileDevices.filter((m) => m.status !== "NOT_APPLICABLE").length;

  const sorted = [...employees].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "computerCount":
        cmp = a.assets.length - b.assets.length;
        break;
      case "mobileCount":
        cmp = mobileCount(a) - mobileCount(b);
        break;
      case "employmentStartDate": {
        const av = a.employmentStartDate ? new Date(a.employmentStartDate).getTime() : 0;
        const bv = b.employmentStartDate ? new Date(b.employmentStartDate).getTime() : 0;
        cmp = av - bv;
        break;
      }
      default: {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        cmp = String(av).localeCompare(String(bv));
      }
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const statuses = ["NEW_HIRE", "PENDING_START", "ACTIVE", "OFFBOARDING", "OFFBOARDED"];
  const types = ["FTE", "CW", "OSP", "Intern"];
  const qSuffix = q ? `&q=${encodeURIComponent(q)}` : "";
  const statusSuffix = searchParams.status ? `&status=${searchParams.status}` : "";
  const typeSuffix = searchParams.type ? `&type=${searchParams.type}` : "";
  const filterSuffix = `${qSuffix}${statusSuffix}${typeSuffix}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Employees</h1>
        <Link
          href="/employees/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + New Hire
        </Link>
      </div>

      <form method="GET" action="/employees" className="mb-4">
        {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
        {searchParams.type && <input type="hidden" name="type" value={searchParams.type} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name, email, phone, manager, or asset tag..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </form>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href={`/employees?${q ? `q=${encodeURIComponent(q)}` : ""}`} className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100">
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/employees?status=${s}${qSuffix}`}
            className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100"
          >
            {s.replaceAll("_", " ")}
          </Link>
        ))}
        {types.map((t) => (
          <Link
            key={t}
            href={`/employees?type=${t}${qSuffix}`}
            className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100"
          >
            {t}
          </Link>
        ))}
      </div>

      {q && (
        <p className="mb-4 text-sm text-slate-500">
          {employees.length} result{employees.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {Object.entries(SORTABLE_COLUMNS).map(([key, label]) => {
                const isActive = sortKey === key;
                const nextDir = isActive && sortDir === "asc" ? "desc" : "asc";
                return (
                  <th key={key} className="px-4 py-3">
                    <Link
                      href={`/employees?sort=${key}&dir=${nextDir}${filterSuffix}`}
                      className={`flex items-center gap-1 hover:text-slate-900 ${isActive ? "text-slate-900" : ""}`}
                    >
                      {label}
                      {isActive && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => (
              <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/employees/${e.id}`} className="font-medium text-slate-900 hover:underline">
                    {e.fullName}
                  </Link>
                  <div className="text-xs text-slate-400">{e.intuitEmail || "no email on file"}</div>
                </td>
                <td className="px-4 py-3">{e.employeeType ? <Badge value={e.employeeType} /> : "—"}</td>
                <td className="px-4 py-3">
                  <Badge value={e.status} />
                </td>
                <td className="px-4 py-3">
                  {e.employmentStartDate ? new Date(e.employmentStartDate).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  {e.assets.length > 0
                    ? `${e.assets.length} computer${e.assets.length > 1 ? "s" : ""}`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {mobileCount(e) > 0
                    ? `${mobileCount(e)} mobile${mobileCount(e) > 1 ? "s" : ""}`
                    : "—"}
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No employees yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
