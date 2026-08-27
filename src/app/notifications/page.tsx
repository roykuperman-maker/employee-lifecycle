import { prisma } from "@/lib/db";
import { Badge } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const notifications = await prisma.notification.findMany({
    include: { employee: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Notifications</h1>
      <p className="mb-6 text-sm text-slate-500">
        Slack DMs send for real in production (status <Badge value="SENT" /> means it actually went
        out). Email isn&apos;t wired up yet, and anything run locally always stays{" "}
        <Badge value="SIMULATED" /> — this log shows what it would have sent instead.
      </p>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div key={n.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Badge value={n.channel} />
                <Badge value={n.status} />
                <span className="text-slate-400">{n.triggerType}</span>
              </div>
              <span className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
            </div>
            <div className="text-sm">
              <span className="text-slate-400">To:</span> {n.toAddress}
              {n.ccAddresses && (
                <>
                  {" "}
                  <span className="text-slate-400">CC:</span> {n.ccAddresses}
                </>
              )}
            </div>
            {n.subject && <div className="text-sm font-medium">{n.subject}</div>}
            <div className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{n.body}</div>
            {n.employee && <div className="mt-2 text-xs text-slate-400">Re: {n.employee.fullName}</div>}
          </div>
        ))}
        {notifications.length === 0 && (
          <p className="text-sm text-slate-400">No notifications yet.</p>
        )}
      </div>
    </div>
  );
}
