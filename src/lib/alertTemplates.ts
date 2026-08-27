import { MOBILE_REFRESH_REQUEST_URL, MOBILE_BUYBACK_URL, LINE_FORM_URLS, MOBILE_SUPPORT_EMAIL } from "@/lib/constants";

// Real T4i Israel team copy, transcribed verbatim (placeholders substituted).
// "update process attached" refers to an external attachment their real
// email flow includes — left in as-is since it's their literal wording, even
// though this app's simulated notifications don't model attachments yet.

function fmtDate(date: Date | null | undefined): string {
  return date ? date.toLocaleDateString() : "N/A";
}

export function mobileRefreshRequestAlert(fullName: string): string {
  return `Hi ${fullName}

According to our records, you are eligible for a mobile device refresh.
Please fill in the form below so we can start the refresh process for you.
If you have already ordered a refresh, or you do not wish to refresh at this time, please fill in the update process attached to this email. There is no need to reapply for a refresh. Please contact the T4i team to for further inquiries and/or questions.

${MOBILE_REFRESH_REQUEST_URL}


Thank you,
T4i Israel Team`;
}

export function mobileReturnOldDeviceAlert(fullName: string, oldDeviceModel: string, deliveryDate: Date | null): string {
  return `Hi ${fullName},

Kind reminder that your ${oldDeviceModel || "mobile device"} has been delivered to you on ${fmtDate(deliveryDate)}, but according to our records you have yet to return your old device. Please return it to the T4i team as soon as you are able to. Make sure to reset the device to factory defaults before returning it.

If you would like to keep this device, You may also opt for Buybak at this link:

${MOBILE_BUYBACK_URL}

Thank you,
T4i team`;
}

export function laptopReturnOldDeviceAlert(
  fullName: string,
  oldModel: string,
  oldAssetTag: string,
  assignedDate: Date | null
): string {
  return `Hi ${fullName},

According to our records, your laptop was refreshed, yet you have not returned your old laptop (${oldModel || "unknown model"}, asset tag ${oldAssetTag}, assigned ${fmtDate(assignedDate)}). In order to avoid your BU being charged for the equivalent of a new laptop, please return it to the TechKnowBar ASAP.

For any questions or inquiries regarding this matter, please contact the local TLV TechKnowBar team.

Thank you,
T4i Israel`;
}

export function newHireLinksCwOsp(fullName: string): string {
  return `Hi ${fullName},

On behalf of the T4i Israel team - a very warm welcome to Intuit.
Here are some of the links that I believe you will find useful for your work at Intuit:

Insight
https://intuitcloud.sharepoint.com/Pages/home.aspx

Set up Intelligent Hub:
https://intuitcloud.sharepoint.com/TechServices/Pages/enterprise-mobility-management.aspx

Beyond Identity Enroll:
https://intuitcloud.sharepoint.com/techservices/pages/tech-article.aspx?article_id=KB1362129

Service Desk
https://insight.intuit.com/home#menu=support-center&support-center-channel=it-help-desk

Reserve Space:
https://intuit.service-now.com/sp?id=wsd_search

Run this command in terminal to fix the time:
sudo systemsetup -settimezone Asia/Jerusalem

For any further questions - please feel free to contact us.

Thank you,
T4i Israel team.`;
}

export function newHireLinksFte(fullName: string): string {
  return `Hi ${fullName},

On behalf of the T4i Israel team - a very warm welcome to Intuit.
Here are some of the links that I believe you will find useful for your work at Intuit:

Insight
https://intuitcloud.sharepoint.com/Pages/home.aspx

Order phone
${MOBILE_REFRESH_REQUEST_URL}

Set up Intelligent Hub:
https://intuitcloud.sharepoint.com/TechServices/Pages/enterprise-mobility-management.aspx

Beyond Identity Enroll:
https://intuitcloud.sharepoint.com/techservices/pages/tech-article.aspx?article_id=KB1362129

Service Desk
https://insight.intuit.com/home#menu=support-center&support-center-channel=it-help-desk

Reserve Space:
https://intuit.service-now.com/sp?id=wsd_search

Swift - Order computer peripherals (Will be active up in up to 3 business days):
https://swift-exp.app.intuit.com/purchase-requisition/home

Run this command in terminal to fix the time:
sudo systemsetup -settimezone Asia/Jerusalem

For any further questions - please feel free to contact us.

Thank you,
T4i Israel team.`;
}

export function orientationCalendarInvite(fullName: string, startDate: Date | null): string {
  return `Event: New Hire Orientation
Attendee: ${fullName}
Location: TechKnow Bar, 10th floor
Date: ${fmtDate(startDate)} at 11:00 AM`;
}

export function endOfEmploymentFte(fullName: string, terminationDate: Date | null): string {
  return `Hi ${fullName}

According to our records, you will be leaving Intuit on ${fmtDate(terminationDate)}.
Please make sure you return your laptop and charger on your last day, or prior to that. If you require us to coordinate shipping, please fill in the update process attached, (Check "Shipping required" box and fill in your phone and address), and we will assist you with that. IMPORTANT - Make sure you disconnect your Apple ID account from the laptop prior to returning it.

If you have recieved an Intuit Owned mobile device, you may acquire it as a personal device using this form:
${MOBILE_BUYBACK_URL}
If you do not wish to purchase the device, you will need to return it prior to your last day of employment.

Your line has been released to be ported out of Intuit account. Please make sure your cellular line is ported out of Intuit account and into your private account at the vendor of your choosing prior to your last day of employment at Intuit. If you wish to stay with Partner as your private vendor, please fill in the following form, and upload it in the attached update process.
${LINE_FORM_URLS.TAKE_PRIVATE_OWNERSHIP}
We wish you all the best at your future endeavors.

Thank you,
T4i Israel team`;
}

export function endOfEmploymentCwOsp(fullName: string, terminationDate: Date | null): string {
  return `Hi ${fullName}

According to our records, you will be leaving Intuit on ${fmtDate(terminationDate)}.
Please make sure you return your laptop and charger on your last day, or prior to that. If you require us to coordinate shipping, please fill in the update process attached, (Check "Shipping required" box and fill in your phone and address), and we will assist you with that. IMPORTANT - Make sure you disconnect your Apple ID account from the laptop prior to returning it.

If you have received a new mobile device, you are required to return that also. If you are in posession of more than one mobile device, you will be required to return the older one prior to your offboarding day.

If your line has been ported into Intuit's Partner account, please know that your line has been released to be ported out of Intuit account. Please make sure your cellular line is ported out of Intuit account and into your private account at the vendor of your choosing prior to your last day of employment at Intuit. If you wish to stay with Partner as your private vendor, please fill in the following form, and upload it in the attached update process.
${LINE_FORM_URLS.TAKE_PRIVATE_OWNERSHIP}
We wish you all the best at your future endeavors.

Thank you,
T4i Israel team`;
}

// --- DEACTIVATED: written per Roy's copy but not wired anywhere yet. ---
// He'll give trigger instructions later (depends on order/ticket state this
// app doesn't track yet).

export function mobileOrderReceivedAlert(fullName: string, deviceType: string): string {
  return `Hi ${fullName},

Your mobile device order of ${deviceType} was received and is being handled by us. Your ServiceNow ticket will be closed and we will inform you via Email once it has arrived. There's no need to approach the TechKnowBar before you get the email inviting you to collect your device.

For further questions please contact TLV_MobileSupport@intuit.com

Thank you,
Israel T4i team`;
}

// ACTIVE — fires the moment a MobileDevice first becomes ASSIGNED (FTE
// intake, or CW/OSP director approval). See both call sites in
// src/app/api/employees/route.ts and src/app/api/mobile-devices/[id]/route.ts.
export function tkbPickupInviteAlert(fullName: string): string {
  return `Hi ${fullName},

The mobile device you have ordered is waiting for you at the 10th floor TechKnowBar. Please coordinate with the T4i team a time to pick it up.

Thank you,
T4i Israel team`;
}

// ACTIVE — fires when Roy checks "Delivered" on a MOBILE_DEVICE_REQUEST
// ticket whose requestType is "New Request" (not "Refresh Request" — a
// refresh keeps the existing line, so no new-line setup is needed). See
// src/app/api/tickets/[id]/route.ts.
export function mobileLineSetupMessage(name: string, deviceType: string): string {
  return `Hi ${name},

We have received your mobile device order for ${deviceType}.

Please note that an Intuit issued mobile device must have an Intuit owned line on it. For that matter we require more information. You may choose one of the following:

1- Partner - if your current line vendor is Partner and you wish to change it's ownership

2- Non Partner - Your current line vendor is not partner (012, Golan, Cellcom, etc') and you wish to port your existing number under Intuit account at Partner.

3- New line creation - If you do not want your personal line to be owned by Intuit and wish to have a new Intuit owned line created for you. (Please note that you may not use your personal SIM with your Intuit issued phone).

For any questions please contact ${MOBILE_SUPPORT_EMAIL}

Thank you,
Intuit TLV Mobile support team.`;
}

// Codes embedded in the Slack dropdown's option values (as `${CODE}::${ticketId}`)
// and read back in src/app/api/slack/interactions/route.ts.
export const LINE_OPTION_CODES = {
  PARTNER: "PARTNER",
  NON_PARTNER: "NON_PARTNER",
  NEW_LINE: "NEW_LINE",
} as const;

export function mobileLineSetupBlocks(ticketId: string, name: string, deviceType: string): unknown[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: mobileLineSetupMessage(name, deviceType) },
    },
    {
      type: "actions",
      block_id: "mobile_line_option_block",
      elements: [
        {
          type: "static_select",
          action_id: "mobile_line_option",
          placeholder: { type: "plain_text", text: "Choose an option" },
          options: [
            {
              text: { type: "plain_text", text: "1 - Partner" },
              value: `${LINE_OPTION_CODES.PARTNER}::${ticketId}`,
            },
            {
              text: { type: "plain_text", text: "2 - Non Partner" },
              value: `${LINE_OPTION_CODES.NON_PARTNER}::${ticketId}`,
            },
            {
              text: { type: "plain_text", text: "3 - New line creation" },
              value: `${LINE_OPTION_CODES.NEW_LINE}::${ticketId}`,
            },
          ],
        },
      ],
    },
  ];
}

// Appends ?name=&phone=&ticketId=&email= so the static partner-*-form pages
// can autofill and (for PORT_IN only) tell our backend which ticket/employee
// to follow up with on submission. Any missing value is simply omitted
// rather than passed as an empty param the form would blank out with.
function withAutofillParams(
  url: string,
  name: string | null,
  phone: string | null,
  ticketId?: string | null,
  email?: string | null
): string {
  const params = new URLSearchParams();
  if (name) params.set("name", name);
  if (phone) params.set("phone", phone);
  if (ticketId) params.set("ticketId", ticketId);
  if (email) params.set("email", email);
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export function partnerOwnershipTransferReply(name: string | null, phone: string | null): string {
  const url = withAutofillParams(LINE_FORM_URLS.INCOMING_TRANSFER, name, phone);
  return `Please submit in the following form to transfer the ownership of your device to Intuit's Partner Account\n${url}`;
}

// PORT_IN's form link also carries ticketId + email so the static form's
// submit call can identify which ticket/employee to follow up with (the
// other 2 forms don't need this — see docs/partner-port-form/index.html).
export function partnerPortInReply(
  name: string | null,
  phone: string | null,
  ticketId: string,
  email: string | null
): string {
  const url = withAutofillParams(LINE_FORM_URLS.PORT_IN, name, phone, ticketId, email);
  return `Please submit the following form to port in your line to Intuit's Partner account\n${url}`;
}

export function newLineReply(): string {
  return `We will ask Partner to create a new line for you.`;
}

// Sent to PARTNER_EMAIL (real send — see src/lib/notifications.ts) when the
// employee picks "New line creation" from the Slack dropdown.
export function newLinePartnerEmailSubject(name: string): string {
  return `יצירת קו חדש ${name}`;
}

export function newLinePartnerEmailBody(name: string, simNumber: string | null): string {
  return `שלום,

נא ליצור קו חדש תחת חשבון אינטואיט.
שם ${name}
סים ${simNumber || "(SIM number not on file — contact T4i)"}
נא לוודא הפעלת חבילת חו״ל אוטומטית על המנוי כמוסכם עם אינטואיט.

תודה,
רועי`;
}

// ACTIVE — fires the moment the employee submits the port-in form (the
// docs/partner-port-form/index.html page's "שלח לפרטנר" button), via
// src/app/api/partner-forms/submit/route.ts.
export function portInSubmittedMessage(): string {
  return `Thank you for submitting the port in form to Partner. Please contact 1-800-054-005 to approve the port in.`;
}

export const PORT_IN_CALL_DONE_ACTION_ID = "port_in_call_done";

export function portInSubmittedBlocks(ticketId: string): unknown[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: portInSubmittedMessage() },
    },
    {
      type: "actions",
      block_id: "port_in_call_done_block",
      elements: [
        {
          type: "button",
          action_id: PORT_IN_CALL_DONE_ACTION_ID,
          text: { type: "plain_text", text: "Done" },
          style: "primary",
          value: ticketId,
        },
      ],
    },
  ];
}

// Sent to PARTNER_EMAIL (real send) when the employee presses "Done" on the
// port-in call-confirmation Slack message.
export function portInCallDonePartnerEmailSubject(phone: string): string {
  return `בוצע אישור ניוד טלפוני לקו ${phone}`;
}

export function portInCallDonePartnerEmailBody(phone: string, simNumber: string | null): string {
  return `שלום,

בוצעה שיחת ניוד למספר 1-800-054-005 עבור קו ${phone}
נא להשלים ניוד קו זה לסים ${simNumber || "(SIM number not on file — contact T4i)"}

תודה,
רועי`;
}
