"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COMPUTER_TYPE_LABELS } from "@/lib/constants";

const inputClass =
  "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";
const labelClass = "block text-sm font-medium text-slate-700";

export function NewHireForm() {
  const router = useRouter();
  const [employeeType, setEmployeeType] = useState("FTE");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mobileApplicable = true; // phone number is always collectible; eligibility/approval handled after creation

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      fullName: form.get("fullName"),
      intuitEmail: form.get("intuitEmail"),
      phoneNumber: form.get("phoneNumber") || undefined,
      employeeType: form.get("employeeType"),
      jobTitle: form.get("jobTitle") || undefined,
      computerType: form.get("computerType"),
      computerAsset: form.get("computerAsset"),
      managerName: form.get("managerName"),
      managerEmail: form.get("managerEmail"),
      employmentStartDate: form.get("employmentStartDate"),
    };

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create employee");
      }
      const employee = await res.json();
      router.push(`/employees/${employee.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div>
        <label className={labelClass}>Full Name</label>
        <input name="fullName" required className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Intuit Email</label>
        <input name="intuitEmail" type="email" required className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Employee Type</label>
        <select
          name="employeeType"
          value={employeeType}
          onChange={(e) => setEmployeeType(e.target.value)}
          className={inputClass}
        >
          <option value="FTE">Full Time Employee (FTE)</option>
          <option value="CW">Contingent Worker (CW)</option>
          <option value="OSP">OSP</option>
          <option value="Intern">Intern</option>
        </select>
        {employeeType !== "FTE" && (
          <p className="mt-1 text-xs text-amber-600">
            Mobile device is pending Business Unit director approval — you can approve it later from the
            employee record.
          </p>
        )}
      </div>

      <div>
        <label className={labelClass}>Job Title / Role (optional)</label>
        <input name="jobTitle" placeholder="e.g. Software Engineer Intern" className={inputClass} />
        <p className="mt-1 text-xs text-slate-400">
          If this contains &ldquo;Intern&rdquo;, Employee Type above will be set to Intern automatically
          (CW/OSP rules apply) regardless of what&apos;s selected.
        </p>
      </div>

      {mobileApplicable && (
        <div>
          <label className={labelClass}>
            Phone Number {employeeType === "FTE" ? "" : "(optional, only if mobile device applies)"}
          </label>
          <input name="phoneNumber" required={employeeType === "FTE"} className={inputClass} />
        </div>
      )}

      <div>
        <label className={labelClass}>Computer Type</label>
        <select name="computerType" required className={inputClass}>
          {Object.entries(COMPUTER_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Computer Asset</label>
        <input name="computerAsset" required placeholder="Asset tag / serial number" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Manager Name</label>
        <input name="managerName" required className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Manager Email</label>
        <input name="managerEmail" type="email" required className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Employment Start Date</label>
        <input name="employmentStartDate" type="date" required className={inputClass} />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create Employee"}
      </button>
    </form>
  );
}
