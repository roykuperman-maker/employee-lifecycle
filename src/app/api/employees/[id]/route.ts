import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      assets: { orderBy: { createdAt: "desc" } },
      mobileDevices: { orderBy: { createdAt: "desc" } },
      lineForms: { orderBy: { createdAt: "desc" } },
      notifications: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(employee);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { action, intuitEmail } = await req.json();

  if (action === "set-email") {
    const updated = await prisma.employee.update({
      where: { id: params.id },
      data: { intuitEmail: intuitEmail || null },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
