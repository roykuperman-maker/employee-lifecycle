"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OffboardPanel({
  employeeId,
  employeeType,
  status,
  hasMobile,
}: {
  employeeId: string;
  employeeType: string | null;
  status: string;
  hasMobile: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [mobileDisposition, setMobileDisposition] = useState("RETURN");
  const [lineDisposition, setLineDisposition] = useState("TAKE_PRIVATE_OWNERSHIP");
  const [started, setStarted] = useState(status === "OFFBOARDING");

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/offboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employmentEndDate: endDate || undefined,
          mobileDisposition: hasMobile ? mobileDisposition : undefined,
          lineDisposition,
        }),
      });
      if (res.ok) {
        setStarted(true);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (started) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-medium">Offboarding</h2>
        <p className="mt-1 text-sm text-slate-500">
          Offboarding is in progress. Track laptop / mobile / line status above.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-medium">Offboarding</h2>
      <div className="space-y-4 text-sm">
        <div>
          <label className="block font-medium text-slate-700">Last Day / End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {hasMobile && (
          <div>
            <label className="block font-medium text-slate-700">Mobile Device</label>
            <select
              value={mobileDisposition}
              onChange={(e) => setMobileDisposition(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="RETURN">Return device</option>
              {employeeType === "FTE" && <option value="BUYBACK">Buy back device (FTE only)</option>}
            </select>
          </div>
        )}

        <div>
          <label className="block font-medium text-slate-700">Phone Line</label>
          <select
            value={lineDisposition}
            onChange={(e) => setLineDisposition(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="TAKE_PRIVATE_OWNERSHIP">Take private ownership (stay with Partner)</option>
            <option value="PORT_OUT">Port out to a different vendor</option>
            <option value="DISCONNECT">Disconnect line</option>
          </select>
        </div>

        <button
          disabled={loading}
          onClick={submit}
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
        >
          {loading ? "Starting..." : "Start Offboarding"}
        </button>
      </div>
    </div>
  );
}
