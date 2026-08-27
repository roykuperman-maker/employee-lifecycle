"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TicketDeliveredCheckbox({ ticketId, delivered }: { ticketId: string; delivered: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (delivered) return; // one-way: once delivered (and notified), don't let it be unchecked/re-triggered
    setLoading(true);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-delivered" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <input
      type="checkbox"
      checked={delivered}
      disabled={loading || delivered}
      onChange={toggle}
      className="h-4 w-4 rounded border-slate-300"
    />
  );
}

export function TicketShipCheckbox({
  ticketId,
  action,
  requested,
}: {
  ticketId: string;
  action: "ship-home" | "ship-to-office";
  requested: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (requested) return; // one-way: already sent, don't re-trigger
    setLoading(true);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <input
      type="checkbox"
      checked={requested}
      disabled={loading || requested}
      onChange={toggle}
      className="h-4 w-4 rounded border-slate-300"
    />
  );
}

export function TicketHomeAddressEditor({ ticketId, homeAddress }: { ticketId: string; homeAddress: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(homeAddress ?? "");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-home-address", homeAddress: value }),
      });
      router.refresh();
      setEditing(false);
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="w-36 rounded-md border border-slate-300 px-1.5 py-0.5 text-xs"
        />
        <button
          disabled={loading}
          onClick={save}
          className="rounded-md border border-slate-300 px-1.5 py-0.5 text-xs hover:bg-slate-100"
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span>{homeAddress || "—"}</span>
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-slate-400 underline hover:text-slate-600"
      >
        {homeAddress ? "edit" : "add"}
      </button>
    </div>
  );
}

export function TicketSimNumberEditor({ ticketId, simNumber }: { ticketId: string; simNumber: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(simNumber ?? "");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-sim-number", simNumber: value }),
      });
      router.refresh();
      setEditing(false);
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="w-28 rounded-md border border-slate-300 px-1.5 py-0.5 text-xs"
        />
        <button
          disabled={loading}
          onClick={save}
          className="rounded-md border border-slate-300 px-1.5 py-0.5 text-xs hover:bg-slate-100"
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span>{simNumber || "—"}</span>
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-slate-400 underline hover:text-slate-600"
      >
        {simNumber ? "edit" : "add"}
      </button>
    </div>
  );
}
