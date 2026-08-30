const COLORS: Record<string, string> = {
  NEW_HIRE: "bg-sky-100 text-sky-800",
  PENDING_START: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-green-100 text-green-800",
  OFFBOARDING: "bg-orange-100 text-orange-800",
  OFFBOARDED: "bg-slate-200 text-slate-700",
  ASSIGNED: "bg-blue-100 text-blue-800",
  RETURN_REQUESTED: "bg-orange-100 text-orange-800",
  RETURNED: "bg-slate-200 text-slate-700",
  NOT_ELIGIBLE: "bg-slate-100 text-slate-600",
  ELIGIBLE_AWAITING_ACTION: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-green-100 text-green-800",
  NOT_APPLICABLE: "bg-slate-100 text-slate-500",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  BUYBACK_REQUESTED: "bg-orange-100 text-orange-800",
  BOUGHT_BACK: "bg-green-100 text-green-800",
  PORTED_OUT: "bg-slate-200 text-slate-700",
  DISCONNECTED: "bg-slate-200 text-slate-700",
  NOT_STARTED: "bg-slate-100 text-slate-600",
  SENT_TO_EMPLOYEE: "bg-amber-100 text-amber-800",
  EMPLOYEE_COMPLETED: "bg-blue-100 text-blue-800",
  SENT_TO_PARTNER: "bg-green-100 text-green-800",
  SIMULATED: "bg-amber-100 text-amber-800",
  SENT: "bg-green-100 text-green-800",
  FTE: "bg-indigo-100 text-indigo-800",
  CW: "bg-purple-100 text-purple-800",
  OSP: "bg-pink-100 text-pink-800",
  Intern: "bg-cyan-100 text-cyan-800",
  Completed: "bg-green-100 text-green-800",
  Pending: "bg-amber-100 text-amber-800",
  Initiated: "bg-sky-100 text-sky-800",
};

export function Badge({ value }: { value: string }) {
  const color = COLORS[value] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
