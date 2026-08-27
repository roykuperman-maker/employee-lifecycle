import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { prisma } from "@/lib/db";
import { TICKET_OPEN_STATES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Employee Lifecycle",
  description: "Intuit employee lifecycle tracker",
};

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/employees", label: "Employees" },
  { href: "/notifications", label: "Notifications" },
  { href: "/reference", label: "Reference" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pendingTicketCount = await prisma.ticket.count({
    where: { state: { in: TICKET_OPEN_STATES } },
  });

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen">
          <aside className="w-56 shrink-0 border-r border-slate-200 bg-white px-4 py-6">
            <div className="mb-8 px-2 text-lg font-semibold">Employee Lifecycle</div>
            <form method="GET" action="/employees" className="mb-4 px-2">
              <input
                type="search"
                name="q"
                placeholder="Search employees..."
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
              />
            </form>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/tickets"
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <span>Tickets</span>
                {pendingTicketCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    {pendingTicketCount}
                  </span>
                )}
              </Link>
            </nav>
          </aside>
          <main className="flex-1 px-8 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
