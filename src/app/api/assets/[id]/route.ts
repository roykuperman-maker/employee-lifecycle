import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { action } = await req.json();

  const asset = await prisma.asset.findUnique({ where: { id: params.id } });
  if (!asset) return NextResponse.json({ error: "No computer on record" }, { status: 404 });

  const now = new Date();

  if (action === "request-return") {
    const updated = await prisma.asset.update({
      where: { id: asset.id },
      data: { status: "RETURN_REQUESTED" },
    });
    return NextResponse.json(updated);
  }

  if (action === "mark-returned") {
    const updated = await prisma.asset.update({
      where: { id: asset.id },
      data: {
        status: "RETURNED",
        returnedAt: now,
        refreshStatus: asset.refreshStatus === "ELIGIBLE_AWAITING_ACTION" ? "COMPLETED" : asset.refreshStatus,
      },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
