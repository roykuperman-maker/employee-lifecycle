"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/Badge";
import { LINE_FORM_LABELS, LINE_FORM_URLS } from "@/lib/constants";

type LineForm = {
  id: string;
  formType: string;
  status: string;
  phoneNumber: string | null;
  sentToEmployeeAt: Date | null;
  sentToPartnerAt: Date | null;
  voicebotApprovedAt: Date | null;
};

export function LineFormsPanel({
  employeeId,
  lineForms,
}: {
  employeeId: string;
  lineForms: LineForm[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newFormType, setNewFormType] = useState("INCOMING_TRANSFER");
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>({});

  async function post(body: Record<string, unknown>) {
    setLoading(true);
    try {
      await fetch(`/api/employees/${employeeId}/line-forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-medium">Line Forms</h2>

      <div className="mb-4 flex gap-2">
        <select
          value={newFormType}
          onChange={(e) => setNewFormType(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          {Object.entries(LINE_FORM_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          disabled={loading}
          onClick={() => post({ action: "create", formType: newFormType })}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
        >
          + Add
        </button>
      </div>

      <div className="space-y-3">
        {lineForms.map((lf) => (
          <div key={lf.id} className="rounded-md border border-slate-100 p-3">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm font-medium">
                {LINE_FORM_LABELS[lf.formType as keyof typeof LINE_FORM_LABELS]}
              </div>
              <Badge value={lf.status} />
            </div>
            <a
              href={LINE_FORM_URLS[lf.formType as keyof typeof LINE_FORM_URLS]}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              {LINE_FORM_URLS[lf.formType as keyof typeof LINE_FORM_URLS]}
            </a>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {lf.status === "NOT_STARTED" && (
                <>
                  <button
                    disabled={loading}
                    onClick={() => post({ action: "send-to-employee", lineFormId: lf.id })}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100 disabled:opacity-50"
                  >
                    Send Form Link to Employee
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => post({ action: "remove", lineFormId: lf.id })}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </>
              )}
              {(lf.status === "SENT_TO_EMPLOYEE" || lf.status === "EMPLOYEE_COMPLETED") && (
                <>
                  <input
                    placeholder="Phone number"
                    defaultValue={lf.phoneNumber ?? ""}
                    onChange={(e) =>
                      setPhoneDrafts((prev) => ({ ...prev, [lf.id]: e.target.value }))
                    }
                    className="w-32 rounded-md border border-slate-300 px-2 py-1 text-xs"
                  />
                  <button
                    disabled={loading}
                    onClick={() =>
                      post({
                        action: "mark-completed-and-send-to-partner",
                        lineFormId: lf.id,
                        phoneNumber: phoneDrafts[lf.id],
                      })
                    }
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    Mark Employee Completed & Send to Partner
                  </button>
                </>
              )}
              {lf.status === "SENT_TO_PARTNER" && lf.formType === "PORT_IN" && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">
                    Sent to Partner {lf.sentToPartnerAt ? new Date(lf.sentToPartnerAt).toLocaleString() : ""}
                  </span>
                  <span className="text-xs text-amber-700">
                    Employee still needs to call 1800-054-005 to approve the port-in via voicebot.
                  </span>
                  <button
                    disabled={loading}
                    onClick={() => post({ action: "confirm-voicebot-approval", lineFormId: lf.id })}
                    className="mt-1 w-fit rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    Confirm Voicebot Approval & Notify Partner
                  </button>
                </div>
              )}
              {lf.status === "SENT_TO_PARTNER" && lf.formType !== "PORT_IN" && (
                <span className="text-xs text-slate-400">
                  Sent to Partner {lf.sentToPartnerAt ? new Date(lf.sentToPartnerAt).toLocaleString() : ""}
                </span>
              )}
              {lf.status === "VOICEBOT_APPROVED" && (
                <span className="text-xs text-green-700">
                  Port-in approved by employee via voicebot
                  {lf.voicebotApprovedAt ? ` on ${new Date(lf.voicebotApprovedAt).toLocaleString()}` : ""} — Partner
                  notified.
                </span>
              )}
            </div>
          </div>
        ))}
        {lineForms.length === 0 && <p className="text-sm text-slate-400">No line forms yet.</p>}
      </div>
    </div>
  );
}
