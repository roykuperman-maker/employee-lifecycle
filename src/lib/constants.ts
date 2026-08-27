export const PARTNER_EMAIL = "maayan.nahari1@service.partner.co.il";
export const ADMIN_EMAIL = "roy_kuperman@intuit.com";
export const MOBILE_SUPPORT_EMAIL = "TLV_Mobilesupport@intuit.com";

export const MOBILE_BUYBACK_URL =
  "https://intuit.service-now.com/sp?id=sc_cat_item&sys_id=430ec844875cae10539887750cbb3555&table=sc_cat_item&searchTerm=TLV%20Mobile";

export const MOBILE_REFRESH_REQUEST_URL =
  "https://intuit.service-now.com/sp?id=sc_cat_item&table=sc_cat_item&sys_id=e2396693976285106900b9a3f153af67";

export const LINE_FORM_URLS: Record<string, string> = {
  INCOMING_TRANSFER: "https://muaddibbb.github.io/partner-incoming-form/",
  PORT_IN: "https://muaddibbb.github.io/partner-port-form/",
  TAKE_PRIVATE_OWNERSHIP: "https://muaddibbb.github.io/partner-transfer-form/",
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

// ServiceNow incident state codes.
export const TICKET_STATE_LABELS: Record<string, string> = {
  "1": "Open",
  "2": "In Progress",
  "-1": "Assigned",
  "-5": "Pending",
  "6": "Resolved",
  "7": "Closed",
  "8": "Cancelled",
};

export const TICKET_OPEN_STATES = ["1", "2", "-1", "-5"];
