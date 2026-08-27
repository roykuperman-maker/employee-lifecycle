import Link from "next/link";
import { prisma } from "@/lib/db";
import { RunDailyButton } from "@/components/RunDailyButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [pendingStart, refreshDueLaptops, refreshDueMobiles, offboarding, pendingLineForms] =
    await Promise.all([
      prisma.employee.count({ where: { status: "PENDING_START" } }),
      prisma.asset.count({ where: { refreshStatus: "ELIGIBLE_AWAITING_ACTION" } }),
      prisma.mobileDevice.count({ where: { refreshStatus: "ELIGIBLE_AWAITING_ACTION" } }),
      prisma.employee.count({ where: { status: "OFFBOARDING" } }),
      prisma.lineForm.count({ where: { status: { not: "SENT_TO_PARTNER" } } }),
    ]);

  const cards = [
    { label: "Upcoming starts", value: pendingStart, href: "/employees?status=PENDING_START" },
    { label: "Laptops refresh-due", value: refreshDueLaptops, href: "/employees" },
    { label: "Mobiles refresh-due", value: refreshDueMobiles, href: "/employees" },
    { label: "In offboarding", value: offboarding, href: "/employees?status=OFFBOARDING" },
    { label: "Pending line forms", value: pendingLineForms, href: "/employees" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-3">
          <RunDailyButton />
          <RunDailyButton endpoint="/api/jobs/run-welcome-checks" label="Run welcome checks now" />
          <Link
            href="/employees/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            + New Hire
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md"
          >
            <div className="text-3xl font-bold">{c.value}</div>
            <div className="mt-1 text-sm text-slate-500">{c.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
