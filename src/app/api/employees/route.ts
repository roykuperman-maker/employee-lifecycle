import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addYears } from "@/lib/dates";
import { LAPTOP_REFRESH_YEARS, MOBILE_REFRESH_YEARS } from "@/lib/constants";
import { sendSlackDM } from "@/lib/notifications";
import { tkbPickupInviteAlert } from "@/lib/alertTemplates";

export async function GET() {
  const employees = await prisma.employee.findMany({
    include: { assets: true, mobileDevices: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(employees);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    fullName,
    intuitEmail,
    phoneNumber,
    employeeType: selectedEmployeeType,
    jobTitle,
    managerName,
    managerEmail,
    employmentStartDate,
    computerType,
    computerAsset,
  } = body;

  if (
    !fullName ||
    !intuitEmail ||
    !selectedEmployeeType ||
    !managerName ||
    !managerEmail ||
    !employmentStartDate ||
    !computerType ||
    !computerAsset
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Job title overrides whatever was picked in the dropdown — an Intern
  // follows CW/OSP rules everywhere downstream (mobile approval, no refresh
  // eligibility), regardless of what was manually selected.
  const employeeType: string =
    typeof jobTitle === "string" && jobTitle.toLowerCase().includes("intern")
      ? "Intern"
      : selectedEmployeeType;

  if (employeeType === "FTE" && !phoneNumber) {
    return NextResponse.json(
      { error: "Phone number is required for FTE (mobile device + line transfer)" },
      { status: 400 }
    );
  }

  const startDate = new Date(employmentStartDate);

  const employee = await prisma.employee.create({
    data: {
      fullName,
      intuitEmail,
      phoneNumber: phoneNumber || null,
      employeeType,
      jobTitle: jobTitle || null,
      managerName,
      managerEmail,
      employmentStartDate: startDate,
      status: "PENDING_START",
      assets: {
        create: [
          {
            computerType,
            assetTag: computerAsset,
            assignedDate: startDate,
            status: "ASSIGNED",
            refreshEligibleDate:
              employeeType === "FTE" ? addYears(startDate, LAPTOP_REFRESH_YEARS) : null,
          },
        ],
      },
      mobileDevices: {
        create: [
          employeeType === "FTE"
            ? {
                phoneNumber,
                status: "ASSIGNED",
                assignedDate: startDate,
                refreshEligibleDate: addYears(startDate, MOBILE_REFRESH_YEARS),
              }
            : {
                phoneNumber: phoneNumber || null,
                status: "PENDING_APPROVAL",
              },
        ],
      },
    },
    include: { assets: true, mobileDevices: true },
  });

  // A mobile device just became ASSIGNED (FTE only — CW/OSP start at
  // PENDING_APPROVAL and get this same alert on director approval instead).
  if (employeeType === "FTE") {
    await sendSlackDM({
      to: employee.intuitEmail ?? "(no email on file)",
      body: tkbPickupInviteAlert(employee.fullName),
      employeeId: employee.id,
      triggerType: "TKB_PICKUP_INVITE",
    });
  }

  return NextResponse.json(employee, { status: 201 });
}
