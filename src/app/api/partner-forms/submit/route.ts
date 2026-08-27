import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/notifications";
import { PARTNER_EMAIL, ADMIN_EMAIL } from "@/lib/constants";

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
  const { subject, body, pdfBase64, filename } = await req.json();

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

  return NextResponse.json({ ok: true, status: notification.status }, { headers: corsHeaders() });
}
