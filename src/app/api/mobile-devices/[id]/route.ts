import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addYears } from "@/lib/dates";
import { MOBILE_REFRESH_YEARS } from "@/lib/constants";
import { sendSlackDM } from "@/lib/notifications";
import { tkbPickupInviteAlert } from "@/lib/alertTemplates";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { action, phoneNumber, assetTag, simNumber } = await req.json();

  const device = await prisma.mobileDevice.findUnique({
    where: { id: params.id },
    include: { employee: true },
  });
  if (!device) return NextResponse.json({ error: "No mobile device on record" }, { status: 404 });

  const now = new Date();

  if (action === "set-phone") {
    const updated = await prisma.mobileDevice.update({
      where: { id: device.id },
      data: { phoneNumber },
    });
    return NextResponse.json(updated);
  }

  if (action === "set-asset-tag") {
    const updated = await prisma.mobileDevice.update({
      where: { id: device.id },
      data: { assetTag: assetTag || null },
    });
    return NextResponse.json(updated);
  }

  if (action === "set-sim-number") {
    const updated = await prisma.mobileDevice.update({
      where: { id: device.id },
      data: { simNumber: simNumber || null },
    });
    return NextResponse.json(updated);
  }

  if (action === "approve") {
    await prisma.employee.update({
      where: { id: device.employeeId },
      data: { businessUnitDirectorApproved: true },
    });
    const wasNewlyAssigned = device.status === "PENDING_APPROVAL";
    const updated = await prisma.mobileDevice.update({
      where: { id: device.id },
      data: wasNewlyAssigned
        ? {
            status: "ASSIGNED",
            assignedDate: now,
            refreshEligibleDate:
              device.employee.employeeType === "FTE" ? addYears(now, MOBILE_REFRESH_YEARS) : null,
          }
        : {},
    });

    if (wasNewlyAssigned) {
      await sendSlackDM({
        to: device.employee.intuitEmail ?? "(no email on file)",
        body: tkbPickupInviteAlert(device.employee.fullName),
        employeeId: device.employeeId,
        triggerType: "TKB_PICKUP_INVITE",
      });
    }

    return NextResponse.json(updated);
  }

  if (action === "request-return") {
    const updated = await prisma.mobileDevice.update({
      where: { id: device.id },
      data: { status: "RETURN_REQUESTED" },
    });
    return NextResponse.json(updated);
  }

  if (action === "request-buyback") {
    if (device.employee.employeeType !== "FTE") {
      return NextResponse.json(
        { error: "Only FTEs are eligible for mobile device buyback" },
        { status: 400 }
      );
    }
    const updated = await prisma.mobileDevice.update({
      where: { id: device.id },
      data: { status: "BUYBACK_REQUESTED" },
    });
    return NextResponse.json(updated);
  }

  if (action === "mark-returned") {
    const updated = await prisma.mobileDevice.update({
      where: { id: device.id },
      data: {
        status: "RETURNED",
        resolvedAt: now,
        refreshStatus: device.refreshStatus === "ELIGIBLE_AWAITING_ACTION" ? "COMPLETED" : device.refreshStatus,
      },
    });
    return NextResponse.json(updated);
  }

  if (action === "mark-bought-back") {
    const updated = await prisma.mobileDevice.update({
      where: { id: device.id },
      data: {
        status: "BOUGHT_BACK",
        resolvedAt: now,
        refreshStatus: device.refreshStatus === "ELIGIBLE_AWAITING_ACTION" ? "COMPLETED" : device.refreshStatus,
      },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
