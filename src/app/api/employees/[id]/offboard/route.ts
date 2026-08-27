import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/notifications";
import { PARTNER_EMAIL, ADMIN_EMAIL, MOBILE_BUYBACK_URL } from "@/lib/constants";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { employmentEndDate, mobileDisposition, lineDisposition } = body;

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { assets: true, mobileDevices: true },
  });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const endDate = employmentEndDate ? new Date(employmentEndDate) : new Date();

  await prisma.employee.update({
    where: { id: params.id },
    data: { status: "OFFBOARDING", employmentEndDate: endDate },
  });

  const activeAssets = employee.assets.filter((a) => a.status !== "RETURNED");
  for (const asset of activeAssets) {
    await prisma.asset.update({
      where: { id: asset.id },
      data: { status: "RETURN_REQUESTED" },
    });
  }

  const checklist: string[] = [];
  if (activeAssets.length > 0) {
    checklist.push(
      activeAssets.length === 1
        ? "Return your assigned computer."
        : `Return your ${activeAssets.length} assigned computers.`
    );
  }

  const activeMobiles = employee.mobileDevices.filter(
    (m) => m.status !== "NOT_APPLICABLE" && m.status !== "RETURNED" && m.status !== "BOUGHT_BACK"
  );

  if (activeMobiles.length > 0) {
    if (mobileDisposition === "BUYBACK") {
      if (employee.employeeType !== "FTE") {
        return NextResponse.json(
          { error: "Only FTEs are eligible for mobile device buyback" },
          { status: 400 }
        );
      }
      for (const device of activeMobiles) {
        await prisma.mobileDevice.update({
          where: { id: device.id },
          data: { status: "BUYBACK_REQUESTED" },
        });
      }
      checklist.push(`Return or buy back your mobile device(s): ${MOBILE_BUYBACK_URL}`);
    } else if (mobileDisposition === "RETURN") {
      for (const device of activeMobiles) {
        await prisma.mobileDevice.update({
          where: { id: device.id },
          data: { status: "RETURN_REQUESTED" },
        });
      }
      checklist.push("Return your mobile device(s).");
    }
  }

  const phone = employee.phoneNumber || employee.mobileDevices[0]?.phoneNumber || "N/A";

  if (lineDisposition === "TAKE_PRIVATE_OWNERSHIP") {
    await prisma.lineForm.create({
      data: {
        employeeId: employee.id,
        formType: "TAKE_PRIVATE_OWNERSHIP",
        phoneNumber: phone,
      },
    });
    checklist.push("Complete the 'take private ownership of line' form (see the Line Forms section on your record).");
  } else if (lineDisposition === "PORT_OUT") {
    await sendEmail({
      to: PARTNER_EMAIL,
      cc: ADMIN_EMAIL,
      subject: `${employee.fullName} - ${phone}`,
      body: `${employee.fullName} is leaving Intuit and porting their line (${phone}) to a different vendor. Please enable port-out for this line.`,
      employeeId: employee.id,
      triggerType: "OFFBOARD_PORT_OUT_PARTNER_NOTIFY",
    });
    checklist.push("Your line has been marked for port-out to your new vendor.");
  } else if (lineDisposition === "DISCONNECT") {
    await sendEmail({
      to: PARTNER_EMAIL,
      cc: ADMIN_EMAIL,
      subject: `${employee.fullName} - ${phone}`,
      body: `${employee.fullName} is leaving Intuit. Please disconnect this line (${phone}).`,
      employeeId: employee.id,
      triggerType: "OFFBOARD_DISCONNECT_PARTNER_NOTIFY",
    });
    checklist.push("Your line has been marked for disconnection.");
  }

  if (employee.intuitEmail && checklist.length > 0) {
    await sendEmail({
      to: employee.intuitEmail,
      subject: "Offboarding checklist",
      body: `Hi ${employee.fullName},\n\nAs part of your offboarding, please complete the following:\n- ${checklist.join("\n- ")}\n\nThank you.`,
      employeeId: employee.id,
      triggerType: "OFFBOARD_CHECKLIST",
    });
  }

  const updated = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { assets: true, mobileDevices: true, lineForms: true },
  });

  return NextResponse.json(updated);
}
