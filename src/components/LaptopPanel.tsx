"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/Badge";
import { COMPUTER_TYPE_LABELS } from "@/lib/constants";

type AssetData = {
  id: string;
  computerType: string | null;
  model: string | null;
  assetTag: string;
  status: string;
  refreshEligibleDate: Date | null;
  refreshStatus: string;
};

function AssetCard({ asset }: { asset: AssetData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action: string) {
    setLoading(true);
    try {
      await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const typeLabel = asset.computerType ? COMPUTER_TYPE_LABELS[asset.computerType] : asset.model || "Unknown model";

  return (
    <div className="rounded-md border border-slate-100 p-3">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-slate-400">Type / Model</div>
          <div>{typeLabel}</div>
          {asset.computerType && asset.model && (
            <div className="text-xs text-slate-400">{asset.model}</div>
          )}
        </div>
        <div>
          <div className="text-slate-400">Asset Tag</div>
          <div>{asset.assetTag}</div>
        </div>
        <div>
          <div className="text-slate-400">Status</div>
          <Badge value={asset.status} />
        </div>
        <div>
          <div className="text-slate-400">Refresh</div>
          <Badge value={asset.refreshStatus} />
          {asset.refreshEligibleDate && (
            <div className="mt-1 text-xs text-slate-400">
              Eligible {new Date(asset.refreshEligibleDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {asset.status !== "RETURN_REQUESTED" && asset.status !== "RETURNED" && (
          <button
            disabled={loading}
            onClick={() => act("request-return")}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
          >
            Request Return
          </button>
        )}
        {asset.status !== "RETURNED" && (
          <button
            disabled={loading}
            onClick={() => act("mark-returned")}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Mark Returned
          </button>
        )}
      </div>
    </div>
  );
}

export function LaptopPanel({ assets }: { assets: AssetData[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-medium">
        Computers {assets.length > 1 && <span className="text-sm font-normal text-slate-400">({assets.length})</span>}
      </h2>
      <div className="space-y-3">
        {assets.map((a) => (
          <AssetCard key={a.id} asset={a} />
        ))}
        {assets.length === 0 && <p className="text-sm text-slate-400">No computers on record.</p>}
      </div>
    </div>
  );
}
