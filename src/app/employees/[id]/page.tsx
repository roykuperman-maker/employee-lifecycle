import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/Badge";
import { EditableEmail } from "@/components/EditableEmail";
import { LaptopPanel } from "@/components/LaptopPanel";
import { MobilePanel } from "@/components/MobilePanel";
import { LineFormsPanel } from "@/components/LineFormsPanel";
import { OffboardPanel } from "@/components/OffboardPanel";
import { TICKET_OPEN_STATES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      assets: { orderBy: { createdAt: "desc" } },
      mobileDevices: { orderBy: { createdAt: "desc" } },
      lineForms: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!employee) notFound();

  const deviceTags = employee.mobileDevices.map((d) => d.assetTag).filter((t): t is string => !!t);
  const openBuybackTags =
    deviceTags.length === 0
      ? []
      : (
          await prisma.ticket.findMany({
            where: {
              category: "MOBILE_BUYBACK",
              state: { in: TICKET_OPEN_STATES },
              assetTag: { in: deviceTags },
            },
            select: { assetTag: true },
          })
        ).map((t) => t.assetTag as string);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{employee.fullName}</h1>
          <EditableEmail employeeId={employee.id} email={employee.intuitEmail} />
          {employee.jobTitle && <p className="text-sm text-slate-400">{employee.jobTitle}</p>}
        </div>
        <div className="flex gap-2">
          {employee.employeeType && <Badge value={employee.employeeType} />}
          <Badge value={employee.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm">
        <div>
          <div className="text-slate-400">Manager</div>
          <div>{employee.managerName || "—"}</div>
          {employee.managerEmail && <div className="text-slate-400">{employee.managerEmail}</div>}
        </div>
        <div>
          <div className="text-slate-400">Start Date</div>
          <div>
            {employee.employmentStartDate
              ? new Date(employee.employmentStartDate).toLocaleDateString()
              : "—"}
          </div>
          {employee.employmentEndDate && (
            <>
              <div className="mt-2 text-slate-400">End Date</div>
              <div>{new Date(employee.employmentEndDate).toLocaleDateString()}</div>
            </>
          )}
        </div>
        {employee.phoneNumber && (
          <div>
            <div className="text-slate-400">Phone Number</div>
            <div>{employee.phoneNumber}</div>
          </div>
        )}
      </div>

      <LaptopPanel assets={employee.assets} />

      <MobilePanel
        employeeType={employee.employeeType}
        businessUnitDirectorApproved={employee.businessUnitDirectorApproved}
        mobileDevices={employee.mobileDevices}
        openBuybackTags={openBuybackTags}
      />

      <LineFormsPanel employeeId={employee.id} lineForms={employee.lineForms} />

      {employee.status !== "OFFBOARDED" && (
        <OffboardPanel
          employeeId={employee.id}
          employeeType={employee.employeeType}
          status={employee.status}
          hasMobile={employee.mobileDevices.some((m) => m.status !== "NOT_APPLICABLE")}
        />
      )}
    </div>
  );
}
