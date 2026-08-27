import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/notifications";
import { LINE_FORM_LABELS, LINE_FORM_URLS, PARTNER_EMAIL, ADMIN_EMAIL } from "@/lib/constants";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { action, formType, lineFormId, phoneNumber } = body;

  const employee = await prisma.employee.findUnique({ where: { id: params.id } });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  if (action === "create") {
    const lineForm = await prisma.lineForm.create({
      data: {
        employeeId: params.id,
        formType,
        phoneNumber: employee.phoneNumber,
      },
    });
    return NextResponse.json(lineForm, { status: 201 });
  }

  const lineForm = await prisma.lineForm.findUnique({ where: { id: lineFormId } });
  if (!lineForm) return NextResponse.json({ error: "Line form not found" }, { status: 404 });

  const now = new Date();
  const formLabel = LINE_FORM_LABELS[lineForm.formType as keyof typeof LINE_FORM_LABELS];
  const formUrl = LINE_FORM_URLS[lineForm.formType as keyof typeof LINE_FORM_URLS];

  if (action === "send-to-employee") {
    if (!employee.intuitEmail) {
      return NextResponse.json(
        { error: "This employee has no email on file yet — add one before sending the form link." },
        { status: 400 }
      );
    }
    await sendEmail({
      to: employee.intuitEmail,
      subject: `Action needed: ${formLabel}`,
      body: `Hi ${employee.fullName},\n\nPlease complete the following form: ${formLabel}\n${formUrl}\n\nOnce submitted, let us know so we can notify the carrier.`,
      employeeId: employee.id,
      triggerType: "LINE_FORM_SENT_TO_EMPLOYEE",
    });

    const updated = await prisma.lineForm.update({
      where: { id: lineForm.id },
      data: { status: "SENT_TO_EMPLOYEE", sentToEmployeeAt: now },
    });
    return NextResponse.json(updated);
  }

  if (action === "remove") {
    if (lineForm.status !== "NOT_STARTED") {
      return NextResponse.json(
        { error: "This form has already been sent — it can't be removed anymore." },
        { status: 400 }
      );
    }
    await prisma.lineForm.delete({ where: { id: lineForm.id } });
    return NextResponse.json({ ok: true });
  }

  if (action === "mark-completed-and-send-to-partner") {
    const finalPhone = phoneNumber || lineForm.phoneNumber || employee.phoneNumber || "N/A";

    await sendEmail({
      to: PARTNER_EMAIL,
      cc: ADMIN_EMAIL,
      subject: `${employee.fullName} - ${finalPhone}`,
      body: `${formLabel} form has been completed for ${employee.fullName} (${finalPhone}).\n\nForm: ${formUrl}`,
      employeeId: employee.id,
      triggerType: "LINE_FORM_SENT_TO_PARTNER",
    });

    const updated = await prisma.lineForm.update({
      where: { id: lineForm.id },
      data: {
        phoneNumber: finalPhone,
        status: "SENT_TO_PARTNER",
        employeeCompletedAt: now,
        sentToPartnerAt: now,
      },
    });
    return NextResponse.json(updated);
  }

  // Port-in specific: after Partner has the form, the employee still has to
  // call 1800-054-005 and approve the port via Partner's voicebot. Once Roy
  // confirms that happened, Partner gets a second, separate email.
  if (action === "confirm-voicebot-approval") {
    if (lineForm.formType !== "PORT_IN" || lineForm.status !== "SENT_TO_PARTNER") {
      return NextResponse.json(
        { error: "Voicebot approval can only be confirmed for a port-in form that's already been sent to Partner." },
        { status: 400 }
      );
    }

    await sendEmail({
      to: PARTNER_EMAIL,
      cc: ADMIN_EMAIL,
      subject: `${employee.fullName} - ${lineForm.phoneNumber ?? "N/A"}`,
      body: `${employee.fullName} has completed the voicebot approval for their port-in request (called 1800-054-005 and confirmed). Please proceed with porting line ${lineForm.phoneNumber ?? "N/A"}.`,
      employeeId: employee.id,
      triggerType: "LINE_FORM_VOICEBOT_APPROVAL_SENT_TO_PARTNER",
    });

    const updated = await prisma.lineForm.update({
      where: { id: lineForm.id },
      data: { status: "VOICEBOT_APPROVED", voicebotApprovedAt: now },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
