import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { PARTNER_EMAIL, ADMIN_EMAIL } from "@/lib/constants";

/**
 * Slack and Partner-bound email ARE wired up for real sending, but ONLY when
 * VERCEL_ENV === "production" (i.e. never during local dev or a preview
 * deploy) — this is deliberate: local testing (including throwaway scripts
 * that fabricate "today" dates to exercise scheduled jobs) must never DM
 * real employees or email the real Partner. Outside of real production,
 * these fall back to the same SIMULATED-log behavior.
 *
 * Email real-sending is scoped to PARTNER_EMAIL only — employee- and
 * admin-facing emails (offboard checklist, line-form links, hardware-prep
 * reminders) still just log SIMULATED, since only Partner notifications were
 * asked to go live.
 */

const CAN_SEND_REAL_SLACK = !!process.env.SLACK_BOT_TOKEN && process.env.VERCEL_ENV === "production";
const CAN_SEND_REAL_EMAIL = !!process.env.RESEND_API_KEY && process.env.VERCEL_ENV === "production";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Testing knob: when set, every real Partner-bound send is redirected here
// instead of the real Partner address — lets Roy exercise the mobile-line
// and partner-form flows for real (real Slack, real Resend send) without
// actually emailing Partner. The Notification row still logs the intended
// PARTNER_EMAIL as `to`, so history stays accurate; only the literal Resend
// recipient changes. Unset this env var to resume real Partner delivery —
// no code change needed either way.
const PARTNER_EMAIL_OVERRIDE = process.env.PARTNER_EMAIL_OVERRIDE || null;

async function sendViaResend(opts: {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  attachments?: { filename: string; content: string }[];
}): Promise<boolean> {
  if (!resend || !process.env.RESEND_FROM_EMAIL) return false;
  const isPartnerBound = opts.to === PARTNER_EMAIL;
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: isPartnerBound && PARTNER_EMAIL_OVERRIDE ? PARTNER_EMAIL_OVERRIDE : opts.to,
    cc: opts.cc,
    replyTo: ADMIN_EMAIL,
    subject: opts.subject,
    text: opts.body,
    attachments: opts.attachments,
  });
  return !error;
}

async function resolveSlackUserId(email: string): Promise<string | null> {
  const res = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
  });
  const data = await res.json();
  return data.ok ? (data.user?.id ?? null) : null;
}

async function postSlackMessage(userId: string, text: string, blocks?: unknown[]): Promise<boolean> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel: userId, text, blocks }),
  });
  const data = await res.json();
  return data.ok === true;
}

export async function sendEmail(opts: {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  employeeId?: string;
  triggerType: string;
  attachments?: { filename: string; content: string }[];
}) {
  let status: "SIMULATED" | "SENT" = "SIMULATED";

  if (CAN_SEND_REAL_EMAIL && opts.to === PARTNER_EMAIL) {
    try {
      if (await sendViaResend(opts)) {
        status = "SENT";
      }
    } catch {
      // Falls back to SIMULATED — still logged below for visibility either way.
    }
  }

  return prisma.notification.create({
    data: {
      channel: "EMAIL",
      toAddress: opts.to,
      ccAddresses: opts.cc,
      subject: opts.subject,
      body: opts.body,
      employeeId: opts.employeeId,
      triggerType: opts.triggerType,
      status,
    },
  });
}

// Sends the same DM to each recipient independently (own Notification row,
// own real/simulated resolution) — used for the shipping-coordinator alerts,
// which fan out to 3 people rather than one.
export async function sendSlackDMToMany(opts: {
  to: string[];
  body: string;
  employeeId?: string;
  triggerType: string;
}) {
  return Promise.all(opts.to.map((to) => sendSlackDM({ to, body: opts.body, employeeId: opts.employeeId, triggerType: opts.triggerType })));
}

export async function sendSlackDM(opts: {
  to: string;
  body: string;
  employeeId?: string;
  triggerType: string;
}) {
  let status: "SIMULATED" | "SENT" = "SIMULATED";

  if (CAN_SEND_REAL_SLACK && opts.to.includes("@")) {
    try {
      const userId = await resolveSlackUserId(opts.to);
      if (userId && (await postSlackMessage(userId, opts.body))) {
        status = "SENT";
      }
    } catch {
      // Falls back to SIMULATED — still logged below for visibility either way.
    }
  }

  return prisma.notification.create({
    data: {
      channel: "SLACK",
      toAddress: opts.to,
      body: opts.body,
      employeeId: opts.employeeId,
      triggerType: opts.triggerType,
      status,
    },
  });
}

/**
 * Same real/simulated gating as sendSlackDM, but for messages with
 * interactive Block Kit elements (e.g. the mobile-line-setup dropdown).
 * `fallbackText` is what's logged to the Notification row and shown to
 * Slack clients that can't render blocks.
 */
export async function sendSlackBlocksDM(opts: {
  to: string;
  fallbackText: string;
  blocks: unknown[];
  employeeId?: string;
  triggerType: string;
}) {
  let status: "SIMULATED" | "SENT" = "SIMULATED";

  if (CAN_SEND_REAL_SLACK && opts.to.includes("@")) {
    try {
      const userId = await resolveSlackUserId(opts.to);
      if (userId && (await postSlackMessage(userId, opts.fallbackText, opts.blocks))) {
        status = "SENT";
      }
    } catch {
      // Falls back to SIMULATED — still logged below for visibility either way.
    }
  }

  return prisma.notification.create({
    data: {
      channel: "SLACK",
      toAddress: opts.to,
      body: opts.fallbackText,
      employeeId: opts.employeeId,
      triggerType: opts.triggerType,
      status,
    },
  });
}
