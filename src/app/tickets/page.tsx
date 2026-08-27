import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/Badge";
import { snowTaskUrl, TICKET_CATEGORY_LABELS, TICKET_STATE_LABELS, TICKET_OPEN_STATES } from "@/lib/constants";
import {
  TicketDeliveredCheckbox,
  TicketSimNumberEditor,
  TicketHomeAddressEditor,
  TicketShipCheckbox,
} from "@/components/TicketMobileActions";

export const dynamic = "force-dynamic";

const SORTABLE_COLUMNS = {
  number: "Number",
  category: "Category",
  shortDescription: "Short Description",
  callerName: "Caller",
  assignmentGroup: "Assignment Group",
  state: "State",
  startDate: "Start Date",
  snowCreatedAt: "Created",
} as const;

type SortKey = keyof typeof SORTABLE_COLUMNS;

function isSortKey(value: string | undefined): value is SortKey {
  return !!value && value in SORTABLE_COLUMNS;
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { category?: string; state?: string; sort?: string; dir?: string };
}) {
  const where: Record<string, unknown> = {};
  if (searchParams.category) where.category = searchParams.category;
  if (searchParams.state === "OPEN") {
    where.state = { in: TICKET_OPEN_STATES };
  } else if (searchParams.state) {
    where.state = searchParams.state;
  }

  const sortKey: SortKey = isSortKey(searchParams.sort) ? searchParams.sort : "snowCreatedAt";
  const sortDir: "asc" | "desc" = searchParams.dir === "asc" ? "asc" : "desc";

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { [sortKey]: sortDir },
  });

  const categories = Object.keys(TICKET_CATEGORY_LABELS);
  const catSuffix = searchParams.category ? `&category=${searchParams.category}` : "";
  const stateSuffix = searchParams.state ? `&state=${searchParams.state}` : "";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <p className="text-sm text-slate-400">
          Manual snapshot from ServiceNow — not live. Re-import to refresh.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/tickets" className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100">
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`/tickets?category=${c}`}
            className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100"
          >
            {TICKET_CATEGORY_LABELS[c]}
          </Link>
        ))}
        <span className="mx-1 text-slate-300">|</span>
        <Link
          href={`/tickets?state=OPEN${catSuffix}`}
          className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100"
        >
          Open only
        </Link>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
      </p>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {Object.entries(SORTABLE_COLUMNS).map(([key, label]) => {
                const isActive = sortKey === key;
                const nextDir = isActive && sortDir === "asc" ? "desc" : "asc";
                return (
                  <th key={key} className="px-4 py-3">
                    <Link
                      href={`/tickets?sort=${key}&dir=${nextDir}${catSuffix}${stateSuffix}`}
                      className={`flex items-center gap-1 hover:text-slate-900 ${isActive ? "text-slate-900" : ""}`}
                    >
                      {label}
                      {isActive && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                    </Link>
                  </th>
                );
              })}
              <th className="px-4 py-3">Request Type</th>
              <th className="px-4 py-3">SIM Number</th>
              <th className="px-4 py-3">Delivered</th>
              <th className="px-4 py-3">Home Address</th>
              <th className="px-4 py-3">Ship Home</th>
              <th className="px-4 py-3">Ship to Office</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  <a
                    href={snowTaskUrl(t.number)}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {t.number}
                  </a>
                </td>
                <td className="px-4 py-3">{TICKET_CATEGORY_LABELS[t.category] ?? t.category}</td>
                <td className="px-4 py-3">{t.shortDescription}</td>
                <td className="px-4 py-3">{t.callerName || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{t.assignmentGroup || "—"}</td>
                <td className="px-4 py-3">
                  <Badge value={TICKET_STATE_LABELS[t.state] ?? t.state} />
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {t.startDate ? new Date(t.startDate).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {t.snowCreatedAt ? new Date(t.snowCreatedAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {t.category === "MOBILE_DEVICE_REQUEST" ? t.requestType || "—" : "—"}
                </td>
                <td className="px-4 py-3">
                  {t.category === "MOBILE_DEVICE_REQUEST" ? (
                    <TicketSimNumberEditor ticketId={t.id} simNumber={t.simNumber} />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  {t.category === "MOBILE_DEVICE_REQUEST" ? (
                    <TicketDeliveredCheckbox ticketId={t.id} delivered={t.delivered} />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <TicketHomeAddressEditor ticketId={t.id} homeAddress={t.homeAddress} />
                </td>
                <td className="px-4 py-3">
                  <TicketShipCheckbox ticketId={t.id} action="ship-home" requested={!!t.shipHomeRequestedAt} />
                </td>
                <td className="px-4 py-3">
                  <TicketShipCheckbox ticketId={t.id} action="ship-to-office" requested={!!t.shipToOfficeRequestedAt} />
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-center text-slate-400">
                  No tickets match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
