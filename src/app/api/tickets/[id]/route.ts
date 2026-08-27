import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSlackBlocksDM, sendSlackDMToMany } from "@/lib/notifications";
import { mobileLineSetupMessage, mobileLineSetupBlocks, shipHomeMessage, shipToOfficeMessage } from "@/lib/alertTemplates";
import { SHIPPING_COORDINATOR_EMAILS } from "@/lib/constants";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { action, simNumber, homeAddress } = await req.json();

  const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "set-sim-number") {
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { simNumber: simNumber || null },
    });
    return NextResponse.json(updated);
  }

  if (action === "set-home-address") {
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { homeAddress: homeAddress || null },
    });
    return NextResponse.json(updated);
  }

  if (action === "ship-home" || action === "ship-to-office") {
    const guardField = action === "ship-home" ? "shipHomeRequestedAt" : "shipToOfficeRequestedAt";
    if (ticket[guardField]) return NextResponse.json(ticket); // one-way, already sent

    const name = ticket.requesterName || ticket.callerName || "the employee";
    const homeAddr = ticket.homeAddress || "(home address not on file)";
    const phone = ticket.requesterPhone || "(phone number not on file)";
    const body =
      action === "ship-home" ? shipHomeMessage(name, homeAddr, phone) : shipToOfficeMessage(name, homeAddr, phone);

    await sendSlackDMToMany({
      to: SHIPPING_COORDINATOR_EMAILS,
      body,
      triggerType: action === "ship-home" ? "SHIP_HOME_REQUEST" : "SHIP_TO_OFFICE_REQUEST",
    });

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { [guardField]: new Date() },
    });
    return NextResponse.json(updated);
  }

  if (action === "set-delivered") {
    let updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { delivered: true },
    });

    const shouldNotify =
      ticket.category === "MOBILE_DEVICE_REQUEST" &&
      ticket.requestType === "New Request" &&
      !ticket.deliveredNotifiedAt &&
      ticket.requesterEmail;

    if (shouldNotify) {
      const name = ticket.requesterName || "there";
      const deviceType = ticket.deviceType || "your mobile device";
      await sendSlackBlocksDM({
        to: ticket.requesterEmail!,
        fallbackText: mobileLineSetupMessage(name, deviceType),
        blocks: mobileLineSetupBlocks(ticket.id, name, deviceType),
        triggerType: "MOBILE_LINE_SETUP",
      });
      updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { deliveredNotifiedAt: new Date() },
      });
    }

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
