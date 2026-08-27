"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RunDailyButton({
  endpoint = "/api/jobs/run-daily",
  label = "Run daily checks now",
}: {
  endpoint?: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      setLastRun(new Date(data.ranAt).toLocaleTimeString());
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
    >
      {loading ? "Running..." : lastRun ? `${label} (last: ${lastRun})` : label}
    </button>
  );
}
