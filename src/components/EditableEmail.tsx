"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EditableEmail({ employeeId, email }: { employeeId: string; email: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(email ?? "");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-email", intuitEmail: value }),
      });
      router.refresh();
      setEditing(false);
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <div className="mt-1 flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="w-64 rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          disabled={loading}
          onClick={save}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <p className="flex items-center gap-2 text-sm text-slate-500">
      {email || "No email on file"}
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-slate-400 underline hover:text-slate-600"
      >
        edit
      </button>
    </p>
  );
}
