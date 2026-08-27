import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, sendSlackBlocksDM } from "@/lib/notifications";
import { PARTNER_EMAIL, ADMIN_EMAIL } from "@/lib/constants";
import { portInSubmittedMessage, portInSubmittedBlocks } from "@/lib/alertTemplates";

// Called cross-origin from the static partner-*-form pages hosted on
// GitHub Pages (roykuperman-maker.github.io) — those are plain HTML/JS with
// no server of their own, so they POST here to actually send the real
// Partner email (via our existing Resend integration) with the filled,
// signed form attached as a PDF. Scoped to a specific origin, not "*", since
// this endpoint sends a real email on every call.
const ALLOWED_ORIGIN = "https://roykuperman-maker.github.io";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  const { subject, body, pdfBase64, filename, formType, ticketId, email } = await req.json();

  if (!subject || !body || !pdfBase64 || !filename) {
    return NextResponse.json(
      { error: "Missing subject, body, pdfBase64, or filename" },
      { status: 400, headers: corsHeaders() }
    );
  }

  const notification = await sendEmail({
    to: PARTNER_EMAIL,
    cc: ADMIN_EMAIL,
    subject,
    body,
    triggerType: "PARTNER_FORM_SUBMISSION",
    attachments: [{ filename, content: pdfBase64 }],
  });

  // Only the port-in form carries ticketId/email — it's the only one with a
  // "call 1-800-054-005 then confirm" follow-up step.
  if (formType === "PORT_IN" && ticketId && email) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (ticket && !ticket.portInFormSubmittedAt) {
      await sendSlackBlocksDM({
        to: email,
        fallbackText: portInSubmittedMessage(),
        blocks: portInSubmittedBlocks(ticketId),
        triggerType: "PORT_IN_FORM_SUBMITTED",
      });
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { portInFormSubmittedAt: new Date() },
      });
    }
  }

  return NextResponse.json({ ok: true, status: notification.status }, { headers: corsHeaders() });
}
