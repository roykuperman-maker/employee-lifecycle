"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/Badge";

type MobileDeviceData = {
  id: string;
  phoneNumber: string | null;
  model: string | null;
  assetTag: string | null;
  simNumber: string | null;
  status: string;
  refreshEligibleDate: Date | null;
  refreshStatus: string;
};

function MobileDeviceCard({
  device,
  employeeType,
  businessUnitDirectorApproved,
  buybackInProcess,
}: {
  device: MobileDeviceData;
  employeeType: string | null;
  businessUnitDirectorApproved: boolean;
  buybackInProcess: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState(device.phoneNumber ?? "");
  const [editingTag, setEditingTag] = useState(false);
  const [assetTag, setAssetTag] = useState(device.assetTag ?? "");
  const [editingSim, setEditingSim] = useState(false);
  const [simNumber, setSimNumber] = useState(device.simNumber ?? "");

  async function act(action: string, extra?: Record<string, unknown>) {
    setLoading(true);
    try {
      await fetch(`/api/mobile-devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const isCwOsp = employeeType !== "FTE";
  const pendingApproval = device.status === "PENDING_APPROVAL";

  return (
    <div className="rounded-md border border-slate-100 p-3">
      {isCwOsp && pendingApproval && !businessUnitDirectorApproved && (
        <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Pending Business Unit director approval. Approve once confirmed.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-slate-400">Phone Number</div>
          {pendingApproval ? (
            <div className="mt-1 flex gap-2">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
              <button
                disabled={loading}
                onClick={() => act("set-phone", { phoneNumber: phone })}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
              >
                Save
              </button>
            </div>
          ) : (
            <div>{device.phoneNumber || "—"}</div>
          )}
        </div>
        <div>
          <div className="text-slate-400">Model</div>
          <div>{device.model || "—"}</div>
        </div>
        <div>
          <div className="text-slate-400">Asset Tag</div>
          {editingTag ? (
            <div className="mt-1 flex gap-2">
              <input
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                autoFocus
                className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
              <button
                disabled={loading}
                onClick={async () => {
                  await act("set-asset-tag", { assetTag });
                  setEditingTag(false);
                }}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>{device.assetTag || "—"}</span>
              <button
                onClick={() => setEditingTag(true)}
                className="text-xs text-slate-400 underline hover:text-slate-600"
              >
                {device.assetTag ? "edit" : "add"}
              </button>
            </div>
          )}
        </div>
        <div>
          <div className="text-slate-400">SIM Number</div>
          {editingSim ? (
            <div className="mt-1 flex gap-2">
              <input
                value={simNumber}
                onChange={(e) => setSimNumber(e.target.value)}
                autoFocus
                className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
              <button
                disabled={loading}
                onClick={async () => {
                  await act("set-sim-number", { simNumber });
                  setEditingSim(false);
                }}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>{device.simNumber || "—"}</span>
              <button
                onClick={() => setEditingSim(true)}
                className="text-xs text-slate-400 underline hover:text-slate-600"
              >
                {device.simNumber ? "edit" : "add"}
              </button>
            </div>
          )}
        </div>
        <div>
          <div className="text-slate-400">Status</div>
          <Badge value={buybackInProcess ? "Buyback in process" : device.status} />
        </div>
        <div>
          <div className="text-slate-400">Refresh</div>
          <Badge value={device.refreshStatus} />
          {device.refreshEligibleDate && (
            <div className="mt-1 text-xs text-slate-400">
              Eligible {new Date(device.refreshEligibleDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {isCwOsp && pendingApproval && !businessUnitDirectorApproved && (
          <button
            disabled={loading}
            onClick={() => act("approve")}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Approve (Director)
          </button>
        )}
        {device.status !== "NOT_APPLICABLE" && !pendingApproval && (
          <>
            {device.status !== "RETURN_REQUESTED" && device.status !== "RETURNED" && (
              <button
                disabled={loading}
                onClick={() => act("request-return")}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
              >
                Request Return
              </button>
            )}
            {employeeType === "FTE" &&
              device.status !== "BUYBACK_REQUESTED" &&
              device.status !== "BOUGHT_BACK" && (
                <button
                  disabled={loading}
                  onClick={() => act("request-buyback")}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
                >
                  Request Buyback
                </button>
              )}
            {device.status !== "RETURNED" && (
              <button
                disabled={loading}
                onClick={() => act("mark-returned")}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
              >
                Mark Returned
              </button>
            )}
            {employeeType === "FTE" && device.status !== "BOUGHT_BACK" && (
              <button
                disabled={loading}
                onClick={() => act("mark-bought-back")}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
              >
                Mark Bought Back
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function MobilePanel({
  employeeType,
  businessUnitDirectorApproved,
  mobileDevices,
  openBuybackTags = [],
}: {
  employeeType: string | null;
  businessUnitDirectorApproved: boolean;
  mobileDevices: MobileDeviceData[];
  openBuybackTags?: string[];
}) {
  const buybackTagSet = new Set(openBuybackTags);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-medium">
        Mobile Devices{" "}
        {mobileDevices.length > 1 && (
          <span className="text-sm font-normal text-slate-400">({mobileDevices.length})</span>
        )}
      </h2>
      <div className="space-y-3">
        {mobileDevices.map((d) => (
          <MobileDeviceCard
            key={d.id}
            device={d}
            employeeType={employeeType}
            businessUnitDirectorApproved={businessUnitDirectorApproved}
            buybackInProcess={!!d.assetTag && buybackTagSet.has(d.assetTag)}
          />
        ))}
        {mobileDevices.length === 0 && <p className="text-sm text-slate-400">No mobile devices on record.</p>}
      </div>
    </div>
  );
}
