import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/notifications";
import { PARTNER_EMAIL, ADMIN_EMAIL } from "@/lib/constants";
import {
  LINE_OPTION_CODES,
  partnerOwnershipTransferReply,
  partnerPortInReply,
  newLineReply,
  newLinePartnerEmailSubject,
  newLinePartnerEmailBody,
} from "@/lib/alertTemplates";

// Slack requires this endpoint to verify every request's signature — without
// a configured signing secret we can't trust the caller at all, so we reject
// outright rather than silently trusting an unverified request that could
// mark tickets or send a real Partner email.
function verifySlackSignature(rawBody: string, timestamp: string | null, signature: string | null): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret || !timestamp || !signature) return false;

  // Reject requests older than 5 minutes (replay protection).
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 60 * 5) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${crypto.createHmac("sha256", secret).update(base).digest("hex")}`;

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function replyViaResponseUrl(responseUrl: string, text: string) {
  await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, response_type: "in_channel" }),
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-slack-signature");
  const timestamp = req.headers.get("x-slack-request-timestamp");

  if (!verifySlackSignature(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const payloadRaw = params.get("payload");
  if (!payloadRaw) return NextResponse.json({ error: "Missing payload" }, { status: 400 });

  const payload = JSON.parse(payloadRaw);
  const action = payload.actions?.[0];
  if (action?.action_id !== "mobile_line_option") {
    return NextResponse.json({ ok: true });
  }

  const [code, ticketId] = String(action.selected_option?.value ?? "").split("::");
  const responseUrl = payload.response_url as string | undefined;
  if (!ticketId || !responseUrl) return NextResponse.json({ ok: true });

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    await replyViaResponseUrl(responseUrl, "Sorry, we couldn't find this request anymore — please contact T4i.");
    return NextResponse.json({ ok: true });
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { lineOptionChosen: code, lineOptionChosenAt: new Date() },
  });

  if (code === LINE_OPTION_CODES.PARTNER) {
    await replyViaResponseUrl(
      responseUrl,
      partnerOwnershipTransferReply(ticket.requesterName, ticket.requesterPhone)
    );
  } else if (code === LINE_OPTION_CODES.NON_PARTNER) {
    await replyViaResponseUrl(
      responseUrl,
      partnerPortInReply(ticket.requesterName, ticket.requesterPhone)
    );
  } else if (code === LINE_OPTION_CODES.NEW_LINE) {
    const name = ticket.requesterName || "the employee";
    await sendEmail({
      to: PARTNER_EMAIL,
      cc: ADMIN_EMAIL,
      subject: newLinePartnerEmailSubject(name),
      body: newLinePartnerEmailBody(name, ticket.simNumber),
      triggerType: "NEW_LINE_PARTNER_REQUEST",
    });
    await replyViaResponseUrl(responseUrl, newLineReply());
  }

  return NextResponse.json({ ok: true });
}
