import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const notifications = await prisma.notification.findMany({
    include: { employee: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notifications);
}
