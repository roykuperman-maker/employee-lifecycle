import {
  PARTNER_EMAIL,
  ADMIN_EMAIL,
  MOBILE_BUYBACK_URL,
  LINE_FORM_LABELS,
  LINE_FORM_URLS,
} from "@/lib/constants";

export default function ReferencePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Reference</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Contacts</h2>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-slate-400">Partner (mobile carrier)</dt>
            <dd>{PARTNER_EMAIL}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Admin (CC on Partner emails)</dt>
            <dd>{ADMIN_EMAIL}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Line Forms</h2>
        <ul className="space-y-3 text-sm">
          {Object.entries(LINE_FORM_LABELS).map(([key, label]) => (
            <li key={key}>
              <div className="font-medium">{label}</div>
              <a
                href={LINE_FORM_URLS[key as keyof typeof LINE_FORM_URLS]}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                {LINE_FORM_URLS[key as keyof typeof LINE_FORM_URLS]}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Mobile Buyback</h2>
        <a href={MOBILE_BUYBACK_URL} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
          {MOBILE_BUYBACK_URL}
        </a>
      </div>
    </div>
  );
}
