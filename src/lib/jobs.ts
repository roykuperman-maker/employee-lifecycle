import { prisma } from "@/lib/db";
import { sendEmail, sendSlackDM } from "@/lib/notifications";
import { thursdayBefore, isToday, dayOfWeekUTC, daysBetweenUTC } from "@/lib/dates";
import { ADMIN_EMAIL } from "@/lib/constants";
import {
  mobileRefreshRequestAlert,
  mobileReturnOldDeviceAlert,
  laptopReturnOldDeviceAlert,
  newHireLinksCwOsp,
  newHireLinksFte,
  orientationCalendarInvite,
  endOfEmploymentFte,
  endOfEmploymentCwOsp,
} from "@/lib/alertTemplates";

const SUNDAY = 0;
const WEDNESDAY = 3;
const OFFBOARD_MILESTONE_DAYS = [21, 14, 7, 3, 1];

async function checkHardwarePrepReminders(today: Date) {
  const pending = await prisma.employee.findMany({
    where: {
      status: "PENDING_START",
      hardwareReminderSent: false,
      employmentStartDate: { not: null },
    },
  });

  for (const employee of pending) {
    const reminderDate = thursdayBefore(employee.employmentStartDate!);
    if (!isToday(reminderDate, today)) continue;

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Prepare hardware for new hire: ${employee.fullName}`,
      body: `${employee.fullName} (${employee.employeeType ?? "type unknown"}) starts on ${employee.employmentStartDate!.toDateString()}. Please prepare their hardware ahead of time.`,
      employeeId: employee.id,
      triggerType: "NEW_HIRE_HARDWARE_PREP",
    });

    await prisma.employee.update({
      where: { id: employee.id },
      data: { hardwareReminderSent: true },
    });
  }
}

async function checkLaptopRefreshEligibility(today: Date) {
  const assets = await prisma.asset.findMany({
    where: {
      refreshStatus: "NOT_ELIGIBLE",
      refreshEligibleDate: { lte: today },
    },
    include: { employee: true },
  });

  for (const asset of assets) {
    if (asset.employee.employeeType !== "FTE") continue;

    await sendSlackDM({
      to: asset.employee.intuitEmail ?? "(no email on file)",
      body: `You're eligible for a laptop refresh! Your current laptop has passed its refresh window. Please coordinate returning your old laptop once your replacement arrives.`,
      employeeId: asset.employeeId,
      triggerType: "LAPTOP_REFRESH_ELIGIBLE",
    });

    await prisma.asset.update({
      where: { id: asset.id },
      data: { refreshStatus: "ELIGIBLE_AWAITING_ACTION", refreshNotifiedAt: today },
    });
  }
}

// Every Sunday: employees with >1 non-returned laptop get nagged about the
// oldest one. Not FTE-restricted — Roy's template doesn't mention type.
async function checkLaptopReturnReminders(today: Date) {
  if (dayOfWeekUTC(today) !== SUNDAY) return;

  const employees = await prisma.employee.findMany({
    where: {
      status: "ACTIVE",
      assets: { some: { status: { not: "RETURNED" } } },
    },
    include: { assets: { where: { status: { not: "RETURNED" } }, orderBy: { assignedDate: "asc" } } },
  });

  for (const employee of employees) {
    if (employee.assets.length <= 1) continue;
    const oldest = employee.assets[0];
    if (oldest.lastReminderSentAt && isToday(oldest.lastReminderSentAt, today)) continue;

    await sendSlackDM({
      to: employee.intuitEmail ?? "(no email on file)",
      body: laptopReturnOldDeviceAlert(employee.fullName, oldest.model ?? "", oldest.assetTag, oldest.assignedDate),
      employeeId: employee.id,
      triggerType: "LAPTOP_RETURN_REMINDER",
    });

    await prisma.asset.update({ where: { id: oldest.id }, data: { lastReminderSentAt: today } });
  }
}

// Silent state flip only — no immediate ping (per Roy: wait for the next
// Sunday alert instead).
async function checkMobileRefreshEligibility(today: Date) {
  const devices = await prisma.mobileDevice.findMany({
    where: {
      refreshStatus: "NOT_ELIGIBLE",
      refreshEligibleDate: { lte: today },
    },
    include: { employee: true },
  });

  for (const device of devices) {
    if (device.employee.employeeType !== "FTE") continue;

    await prisma.mobileDevice.update({
      where: { id: device.id },
      data: { refreshStatus: "ELIGIBLE_AWAITING_ACTION", refreshNotifiedAt: today },
    });
  }
}

// Every Sunday: FTEs with exactly one (not-yet-refreshed) eligible device get
// asked to request a refresh. Stops once a 2nd device shows up (they ordered).
async function checkMobileRefreshAlert(today: Date) {
  if (dayOfWeekUTC(today) !== SUNDAY) return;

  const employees = await prisma.employee.findMany({
    where: {
      status: "ACTIVE",
      employeeType: "FTE",
      mobileDevices: { some: { refreshStatus: "ELIGIBLE_AWAITING_ACTION" } },
    },
    include: {
      mobileDevices: { where: { status: { notIn: ["RETURNED", "BOUGHT_BACK"] } } },
    },
  });

  for (const employee of employees) {
    if (employee.mobileDevices.length !== 1) continue;
    const device = employee.mobileDevices[0];
    if (device.refreshStatus !== "ELIGIBLE_AWAITING_ACTION") continue;
    if (device.lastReminderSentAt && isToday(device.lastReminderSentAt, today)) continue;

    await sendSlackDM({
      to: employee.intuitEmail ?? "(no email on file)",
      body: mobileRefreshRequestAlert(employee.fullName),
      employeeId: employee.id,
      triggerType: "MOBILE_REFRESH_REQUEST_ALERT",
    });

    await prisma.mobileDevice.update({ where: { id: device.id }, data: { lastReminderSentAt: today } });
  }
}

// Sunday + Wednesday: employees with >1 non-returned/bought-back mobile
// device get nagged about the oldest one. Not FTE-restricted (matches Roy's
// literal wording, which offers buyback to anyone in this state).
async function checkMobileReturnReminders(today: Date) {
  const day = dayOfWeekUTC(today);
  if (day !== SUNDAY && day !== WEDNESDAY) return;

  const employees = await prisma.employee.findMany({
    where: {
      status: "ACTIVE",
      mobileDevices: { some: { status: { notIn: ["RETURNED", "BOUGHT_BACK"] } } },
    },
    include: {
      mobileDevices: {
        where: { status: { notIn: ["RETURNED", "BOUGHT_BACK"] } },
        orderBy: { assignedDate: "asc" },
      },
    },
  });

  for (const employee of employees) {
    if (employee.mobileDevices.length <= 1) continue;
    const oldest = employee.mobileDevices[0];
    if (oldest.lastReminderSentAt && isToday(oldest.lastReminderSentAt, today)) continue;

    await sendSlackDM({
      to: employee.intuitEmail ?? "(no email on file)",
      body: mobileReturnOldDeviceAlert(employee.fullName, oldest.model ?? "", oldest.assignedDate),
      employeeId: employee.id,
      triggerType: "MOBILE_RETURN_REMINDER",
    });

    await prisma.mobileDevice.update({ where: { id: oldest.id }, data: { lastReminderSentAt: today } });
  }
}

// T-minus 21/14/7/3/1 days before employmentEndDate, regardless of status.
// Unknown employeeType is skipped (not guessed) since the FTE/CW-OSP
// templates carry materially different obligations.
async function checkOffboardMilestones(today: Date) {
  const employees = await prisma.employee.findMany({
    where: { employmentEndDate: { not: null } },
  });

  for (const employee of employees) {
    const daysLeft = daysBetweenUTC(today, employee.employmentEndDate!);
    if (!OFFBOARD_MILESTONE_DAYS.includes(daysLeft)) continue;
    if (!employee.employeeType) continue;

    const sent = employee.offboardMilestonesSent?.split(",").filter(Boolean) ?? [];
    if (sent.includes(String(daysLeft))) continue;

    const body =
      employee.employeeType === "FTE"
        ? endOfEmploymentFte(employee.fullName, employee.employmentEndDate)
        : endOfEmploymentCwOsp(employee.fullName, employee.employmentEndDate);

    await sendSlackDM({
      to: employee.intuitEmail ?? "(no email on file)",
      body,
      employeeId: employee.id,
      triggerType: "END_OF_EMPLOYMENT_INSTRUCTIONS",
    });

    await prisma.employee.update({
      where: { id: employee.id },
      data: { offboardMilestonesSent: [...sent, String(daysLeft)].join(",") },
    });
  }
}

export async function runDailyChecks(today: Date = new Date()) {
  await checkHardwarePrepReminders(today);
  await checkLaptopRefreshEligibility(today);
  await checkLaptopReturnReminders(today);
  await checkMobileRefreshEligibility(today);
  await checkMobileRefreshAlert(today);
  await checkMobileReturnReminders(today);
  await checkOffboardMilestones(today);
}

// 11am-Israel job: new-hire welcome links + simulated orientation invite.
// Unknown employeeType is skipped for the links message (same reasoning as
// offboarding — the CW/OSP and FTE link sets genuinely differ).
export async function runWelcomeChecks(today: Date = new Date()) {
  const startingToday = await prisma.employee.findMany({
    where: {
      employmentStartDate: { not: null },
      OR: [{ welcomeLinksSent: false }, { orientationInviteSent: false }],
    },
  });

  for (const employee of startingToday) {
    if (!isToday(employee.employmentStartDate!, today)) continue;

    const updates: Record<string, unknown> = {};

    if (!employee.welcomeLinksSent && employee.employeeType) {
      const body =
        employee.employeeType === "FTE" ? newHireLinksFte(employee.fullName) : newHireLinksCwOsp(employee.fullName);

      await sendSlackDM({
        to: employee.intuitEmail ?? "(no email on file)",
        body,
        employeeId: employee.id,
        triggerType: "NEW_HIRE_WELCOME_LINKS",
      });
      updates.welcomeLinksSent = true;
    }

    if (!employee.orientationInviteSent) {
      await prisma.notification.create({
        data: {
          channel: "CALENDAR",
          toAddress: employee.intuitEmail ?? "(no email on file)",
          body: orientationCalendarInvite(employee.fullName, employee.employmentStartDate),
          employeeId: employee.id,
          triggerType: "ORIENTATION_INVITE",
          status: "SIMULATED",
        },
      });
      updates.orientationInviteSent = true;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.employee.update({ where: { id: employee.id }, data: updates });
    }
  }
}
