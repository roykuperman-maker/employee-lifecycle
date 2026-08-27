import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { guessIntuitEmail } from "../src/lib/email";

const prisma = new PrismaClient();

// Snapshot of ServiceNow Catalog Tasks (sc_task) for the 3 T4i TLV ticket
// queues Roy tracks. This is NOT live — the ServiceNow connector is only
// reachable from an interactive Claude session, not from this deployed app.
// To refresh: follow the "sync" skill (.claude/skills/sync) to re-pull the
// data via the connector, overwrite tickets-data.json, then re-run this
// script. Local and prod share one Neon DB, so this updates the live site
// immediately — no `vercel deploy` needed for a data-only refresh.
//
// IMPORTANT: this is an upsert-by-number, not a delete-and-recreate. Tickets
// now carry app-managed state (delivered, simNumber, lineOptionChosen, ...)
// set by Roy or by the Slack line-setup flow — re-syncing must never clobber
// that. Only tickets missing from the fresh pull AND never delivered-on are
// cleaned up, since those are safe to drop (pure unactioned snapshot rows).

type RawTicket = {
  number: string;
  category: "MOBILE_BUYBACK" | "MOBILE_DEVICE_REQUEST" | "NEW_HIRE";
  shortDescription: string;
  description: string;
  callerName: string;
  assignmentGroup: string | null;
  state: string;
  startDate?: string | null; // NEW_HIRE only — ISO date, parsed from the RITM's "Start Date" field
  newHireName?: string | null; // NEW_HIRE only — parsed from the RITM's "New Hire: <Name>" field
  requesterName?: string | null; // MOBILE_DEVICE_REQUEST only
  requesterEmail?: string | null; // MOBILE_DEVICE_REQUEST only
  deviceType?: string | null; // MOBILE_DEVICE_REQUEST only
  requestType?: string | null; // MOBILE_DEVICE_REQUEST only — "New Request" | "Refresh Request"
  snowCreatedAt: string;
};

const TICKETS: RawTicket[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, "tickets-data.json"), "utf-8")
);

async function main() {
  const numbersInSync = TICKETS.map((t) => t.number);
  const removed = await prisma.ticket.deleteMany({
    where: { number: { notIn: numbersInSync }, delivered: false },
  });
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} stale, unactioned ticket(s) no longer in the open snapshot.`);
  }

  for (const t of TICKETS) {
    const snowFields = {
      category: t.category,
      shortDescription: t.shortDescription,
      description: t.description,
      callerName: t.callerName,
      assignmentGroup: t.assignmentGroup,
      state: t.state,
      startDate: t.startDate ? new Date(t.startDate) : null,
      newHireName: t.newHireName ?? null,
      requesterName: t.requesterName ?? null,
      requesterEmail: t.requesterEmail ?? null,
      deviceType: t.deviceType ?? null,
      requestType: t.requestType ?? null,
      snowCreatedAt: new Date(t.snowCreatedAt),
    };
    await prisma.ticket.upsert({
      where: { number: t.number },
      create: { number: t.number, ...snowFields },
      update: snowFields, // never touches delivered/simNumber/lineOptionChosen/*
    });
  }
  console.log(`Synced ${TICKETS.length} tickets.`);

  // A New Hire ticket means someone real is joining — surface them in the
  // Employees list right away (status NEW_HIRE) rather than waiting for
  // manual intake. Idempotent by name: re-running sync won't duplicate.
  const newHireTickets = TICKETS.filter((t) => t.category === "NEW_HIRE" && t.newHireName);
  let created = 0;
  for (const t of newHireTickets) {
    const name = t.newHireName!.trim();
    const existing = await prisma.employee.findFirst({
      where: { fullName: { equals: name, mode: "insensitive" } },
    });
    if (existing) continue;

    await prisma.employee.create({
      data: {
        fullName: name,
        intuitEmail: guessIntuitEmail(name),
        employmentStartDate: t.startDate ? new Date(t.startDate) : null,
        status: "NEW_HIRE",
      },
    });
    created++;
    console.log(`Created employee from New Hire ticket ${t.number}: ${name}`);
  }
  if (newHireTickets.length > 0) {
    console.log(`${created} new employee(s) created from New Hire tickets, ${newHireTickets.length - created} already existed.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
