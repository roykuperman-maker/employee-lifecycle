export const PARTNER_EMAIL = "maayan.nahari1@service.partner.co.il";
export const ADMIN_EMAIL = "roy_kuperman@intuit.com";
export const MOBILE_SUPPORT_EMAIL = "TLV_Mobilesupport@intuit.com";

// DMed by the "Ship Home" / "Ship to Office" ticket checkboxes.
export const SHIPPING_COORDINATOR_EMAILS = [
  "daniela_puker@intuit.com",
  "yanit_levy@intuit.com",
  "jacky_yatzik@intuit.com",
];

export const MOBILE_BUYBACK_URL =
  "https://intuit.service-now.com/sp?id=sc_cat_item&sys_id=430ec844875cae10539887750cbb3555&table=sc_cat_item&searchTerm=TLV%20Mobile";

export const MOBILE_REFRESH_REQUEST_URL =
  "https://intuit.service-now.com/sp?id=sc_cat_item&table=sc_cat_item&sys_id=e2396693976285106900b9a3f153af67";

// These now live under docs/ in this app's own repo (roykuperman-maker/
// employee-lifecycle), served via GitHub Pages — moved off the old
// muaddibbb.github.io host so we could add the "שלח לפרטנר" button and
// autofill support. See docs/partner-*-form/index.html.
export const LINE_FORM_URLS: Record<string, string> = {
  INCOMING_TRANSFER: "https://roykuperman-maker.github.io/employee-lifecycle/partner-incoming-form/",
  PORT_IN: "https://roykuperman-maker.github.io/employee-lifecycle/partner-port-form/",
  TAKE_PRIVATE_OWNERSHIP: "https://roykuperman-maker.github.io/employee-lifecycle/partner-transfer-form/",
};

export const LINE_FORM_LABELS: Record<string, string> = {
  INCOMING_TRANSFER: "Give ownership of line to Intuit (same vendor / Partner)",
  PORT_IN: "Port in line (different vendor / non-Partner)",
  TAKE_PRIVATE_OWNERSHIP: "Take private ownership of line (leaving Intuit, staying with Partner)",
};

export const COMPUTER_TYPE_LABELS: Record<string, string> = {
  MACBOOK_PRO_14: "MacBook Pro 14\"",
  MACBOOK_PRO_16: "MacBook Pro 16\"",
  LENOVO_T14: "Lenovo T14",
  LENOVO_P1: "Lenovo P1",
};

export const LAPTOP_REFRESH_YEARS = 4;
export const MOBILE_REFRESH_YEARS = 3;

export const SNOW_BASE_URL = "https://intuit.service-now.com/nav_to.do?uri=incident.do?sys_id=";

// Tickets tracked in this app are sc_task (Catalog Task) records, not
// incidents, and the snapshot doesn't carry their sys_id — only the task
// number — so link by number lookup instead of by sys_id.
export function snowTaskUrl(number: string): string {
  return `https://intuit.service-now.com/nav_to.do?uri=sc_task.do?sysparm_query=number=${encodeURIComponent(number)}`;
}

export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  MOBILE_BUYBACK: "Mobile Buyback Requests",
  MOBILE_DEVICE_REQUEST: "Mobile Device Request",
  NEW_HIRE: "New Hire",
};

// ServiceNow sc_task (Catalog Task) state codes — these tickets are all
// sc_task records, not incidents.
export const TICKET_STATE_LABELS: Record<string, string> = {
  "1": "Open",
  "2": "In Progress",
  "-1": "Assigned",
  "-5": "Pending",
  "3": "Closed Complete",
  "4": "Cancelled",
};

export const TICKET_OPEN_STATES = ["1", "2", "-1", "-5"];
