import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSlackBlocksDM } from "@/lib/notifications";
import { mobileLineSetupMessage, mobileLineSetupBlocks } from "@/lib/alertTemplates";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { action, simNumber } = await req.json();

  const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "set-sim-number") {
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { simNumber: simNumber || null },
    });
    return NextResponse.json(updated);
  }

  if (action === "set-delivered") {
    const updated = await prisma.ticket.update({
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
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { deliveredNotifiedAt: new Date() },
      });
    }

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
