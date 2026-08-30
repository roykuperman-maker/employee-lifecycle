---
name: sync
description: Manually refresh the Employee Lifecycle app's data from ServiceNow (tickets + hardware/mobile asset status) AND from Reut Arieli's CW report emails (contingent-worker end dates), in one pass. Roy runs this by hand (via /sync) whenever the data looks stale — none of these sources are reachable from the deployed app, so this is the only way they update. Covers all three; don't split into separate invocations.
---

# Sync ServiceNow + CW Report Data

The Employee Lifecycle app has no live connection to ServiceNow or Gmail —
the deployed Vercel app cannot call MCP connectors itself, only an
interactive Claude session can. This skill is the single manual routine
that refreshes everything sourced that way: the `Ticket` snapshot table,
the status/model of assets this app already tracks (`Asset`,
`MobileDevice`), and CW (contingent worker) end dates parsed from Reut
Arieli's periodic report emails into the `ExitProcess` list (see Part C).
Run all parts every time this skill is invoked — don't do just one.
(QuickBase, the other source feeding `ExitProcess`, is NOT part of this
skill — it's reachable directly from the deployed app and syncs itself on
a daily cron, plus a "Sync now" button on /exit-processes.)

Project directory: `/Users/rkuperman/Emplyee lifecycle`

## Why this works without a deploy

Local dev and the deployed Vercel app point at the **same Neon Postgres DB**
(`DATABASE_URL`/`DIRECT_URL` in `.env`). Running these scripts from this
machine updates the live site immediately. No `vercel deploy` needed for a
data-only refresh — only redeploy if you also change code.

---

## Part A — Tickets

### A1. Pull fresh data via the ServiceNow connector

Use the `ServiceNow_Catalog_Task_Lookup` tool (table: `sc_task`). If the tool
name isn't visible, `ToolSearch` for "ServiceNow Catalog Task Lookup" — the
MCP server ID prefix can vary by session.

Run these three queries. `state!=3^state!=4` excludes Closed Complete (3) and
Cancelled (4) — i.e. currently-open tasks. Raise `sysparm_limit` if a query
comes back truncated at the limit (compare count to what you'd expect).

**MOBILE_BUYBACK** (queue: "EE Tech – Mobile - TLV"):
```
sysparm_query: request_item.cat_item.nameLIKETLV Mobile BuyBack^state!=3^state!=4
sysparm_limit: 50
```
This catalog item ("TLV Mobile BuyBack Program") is TLV-exclusive by name, so
no extra location filter is needed. Multiple `sc_task` rows can share one
RITM (invoice processing, payroll confirmation, MDM removal steps are all
separate tasks under one buyback request) — that's expected, import them all
as distinct ticket rows.

**MOBILE_DEVICE_REQUEST** (queue: "EE Tech - TechKnow Bar - TLV", sys_id
`f1ccd63e6f287100afdb33d9ea3ee4a5`):
```
sysparm_query: assignment_group=f1ccd63e6f287100afdb33d9ea3ee4a5^state!=3^state!=4
sysparm_limit: 50
```
The "Mobile Device Request" catalog item is company-wide (Bangalore, US
sites, etc.) — filtering by this exact TLV queue's assignment_group sys_id is
what scopes it correctly. Don't filter by cat_item name alone.

**NEW_HIRE** (Onboarding tasks, routed to several different TLV sub-teams
depending on task type — there's no single fixed assignment_group):
```
sysparm_query: request_item.cat_item.nameLIKEOnboarding^descriptionLIKETel Aviv^state!=3^state!=4
sysparm_limit: 50
```
Also worth a second pass with `descriptionLIKETEL AVIV` (caps) if the first
query looks sparse — onboarding task descriptions aren't consistently cased.
If you want to sanity-check breadth, `assignment_group.nameLIKETLV` (across
all categories, no cat_item filter) is a good cross-check — it surfaces TLV
tasks regardless of catalog item, which is how the New Hire TLV example
(Shaul Tolkowsky, TASK3604300) was originally confirmed.

Known TLV group names ↔ sys_ids (from `ServiceNow_Groups`, query
`nameLIKETLV^active=true`), useful for resolving `assignment_group` display
names since the Catalog Task tool returns them unresolved (`{link, value}`,
not `.name`):
- `f1ccd63e6f287100afdb33d9ea3ee4a5` — EE Tech - TechKnow Bar - TLV
- `5a8cfa7e876f5114c23164ec0ebb3596` — EE Tech – Mobile - TLV
- `cbe1ce5a6fc22500afdb33d9ea3ee4da` — EE Tech - OnSite Tech - TLV
- `7e93e3080f89ba0052e3e388b1050e44` — Site Services - Coordinators - TLV

Buyback fulfillment sub-tasks often carry other assignment groups (Payroll,
Finance, IT) that aren't TLV-named — it's fine to leave `assignmentGroup`
null for those rather than guessing; the category is already correct from
the cat_item match.

### A2. Shape the results

For each task, build an object matching this shape (see
`scripts/tickets-data.json` for the current file):

```json
{
  "number": "TASK3608190",
  "category": "MOBILE_BUYBACK",
  "shortDescription": "<short_description from SNOW>",
  "description": "<a short, human-readable summary — not the full raw dump>",
  "callerName": "<request_item.requested_for.name, or the name in the description if that's blank>",
  "assignmentGroup": "<resolved group name, or null if unknown/not TLV-specific>",
  "state": "<raw state code as a string, e.g. \"1\">",
  "startDate": "<NEW_HIRE only — ISO date (YYYY-MM-DD), parsed from the RITM description's \"Start Date: : MM-DD-YYYY\" field; omit/null for MOBILE_BUYBACK and MOBILE_DEVICE_REQUEST>",
  "newHireName": "<NEW_HIRE only — the new hire's name, parsed from the RITM description's \"New Hire: : <Name>\" field; omit/null for the other 2 categories>",
  "requesterName": "<MOBILE_DEVICE_REQUEST only — RITM's \"Who is this request for?\" field>",
  "requesterEmail": "<MOBILE_DEVICE_REQUEST only — RITM's \"Employee Email\" field>",
  "requesterPhone": "<MOBILE_DEVICE_REQUEST only, when available — e.g. the port-in flow's \"current mobile number to Port In\" field; omit/null if not captured on the request>",
  "deviceType": "<MOBILE_DEVICE_REQUEST only — RITM's \"Choose your preferred model\" field>",
  "requestType": "<MOBILE_DEVICE_REQUEST only — RITM's \"Select Request Type\" field, exactly \"New Request\" or \"Refresh Request\">",
  "snowCreatedAt": "<sys_created_on as ISO 8601>"
}
```

`requesterName`/`requesterEmail`/`deviceType`/`requestType` feed the
"Delivered" checkbox flow on `/tickets` (see `src/app/api/tickets/[id]/route.ts`)
— when Roy checks Delivered on a row whose `requestType` is exactly `"New
Request"`, the app Slack-DMs `requesterEmail` about setting up an Intuit
line. Get `requestType` exactly right — `"Refresh Request"` (existing line,
no setup needed) must never trigger that message.

Skip `-INACTIVE` suffixed names as-is (that's ServiceNow's own convention for
departed employees) — don't strip it, it's informative.

For `startDate` on NEW_HIRE tickets: the RITM description embeds it as
`Start Date: : MM-DD-YYYY` (US-style month-day-year, confirmed from real
data) — convert to ISO before writing to the JSON file.

For `newHireName`: the RITM description embeds it as `New Hire: : <Name>`
(distinct from `Preparer: : <Name>`, which is whoever submitted the ticket on
the new hire's behalf — don't confuse the two, `callerName` on the Ticket
model is the preparer). `newHireName` is what `import-tickets.ts` uses to
auto-create an `Employee` row (status `NEW_HIRE`) if one doesn't already
exist by name — get this field right or the auto-create will either miss the
real name or silently do nothing.

### A3. Write the data and re-import

Overwrite `scripts/tickets-data.json` with the full fresh array (all 3
categories combined, in any order), then run:

```bash
cd "/Users/rkuperman/Emplyee lifecycle" && npx tsc --noEmit && npx tsx scripts/import-tickets.ts
```

This upserts by `number` — it does NOT delete-and-recreate. Tickets now carry
app-managed state (`delivered`, `simNumber`, `lineOptionChosen`, ...) set by
Roy or by the Slack line-setup flow, and re-syncing must never clobber that.
Only tickets missing from the fresh pull AND never `delivered` are cleaned
up automatically. The fresh array should still be the complete current open
set (don't just append new tickets to the old file) — the upsert handles the
rest safely.

---

## Part B — Assets (hardware + mobile status refresh)

### Scope, and what this deliberately does NOT do

This app already tracks ~994 known asset tags (computers + mobiles) across
611 employees. This routine refreshes their **current status and model**
from ServiceNow — it does **not** discover brand-new device assignments to
employees we don't already have an asset row for. That's a deliberate scope
limit: `ServiceNow_Hardware_Assets_Lookup`'s `assigned_to` field comes back
as an unresolved sys_id (only org-name/job-function dot-walked fields
resolve, not email or name), so there's no reliable way to identify *who* a
brand-new, never-seen asset tag belongs to from this tool alone. New
assignments surface through Part A (Mobile Device Request / New Hire
tickets already carry the employee's name/email) or through normal intake
in the app — not through this part.

Both computer asset tags (`IL01092` style) and mobile asset tags (15-digit
IMEIs, stored identically in ServiceNow's own `asset_tag` and
`serial_number` fields — confirmed by testing) are queried the same way via
`asset_tag=`.

### B1. Export known tags and get batch queries

```bash
cd "/Users/rkuperman/Emplyee lifecycle" && npx tsx scripts/export-known-assets.ts
```

This writes `scripts/known-assets.json` (current DB state: id, kind,
employeeId, assetTag, model, status) and prints ~40 batches of 25
OR-chained `asset_tag=` queries (`ServiceNow_Hardware_Assets_Lookup` has no
`IN` operator). Placeholder tags (`UNKNOWN`) are already excluded. Batch
size is 25, not larger — each asset record is verbose (org hierarchy fields,
warranty dates, etc.), and a 40-tag batch's raw result has been observed to
exceed the tool-result size limit and get diverted to a file instead of
returned inline.

### B2. Run each batch through the connector

For each printed query, call `ServiceNow_Hardware_Assets_Lookup` with
`sysparm_limit` at least the batch size (25). Collect, per asset returned:
`asset_tag`, `install_status`, `display_name`.

If a batch's result still comes back too large to view inline (diverted to a
file, as noted above), don't try to read it directly — extract just the 3
needed fields with a quick script instead, e.g.:
```bash
python3 -c "
import json
data = json.load(open('<path from the error message>'))
compact = [{'assetTag': a['asset_tag'], 'installStatus': a['install_status'], 'displayName': a['display_name']} for a in data['result']['assets']]
print(json.dumps(compact))
"
```

Install status codes: `1`=Deployed, `9`=In Transit, `11`=Received,
`12`=In Inventory, `13`=Pending Disposal, `14`=Disposed, `16`=Lost.

### B3. Shape and apply

Write everything collected across all batches into
`scripts/asset-sync-results.json`:

```json
[
  { "assetTag": "IL01092", "installStatus": "1", "displayName": "IL01092 - Apple Computer Inc MacBook M3 Pro (14\" 36GB)" }
]
```

Then run:

```bash
cd "/Users/rkuperman/Emplyee lifecycle" && npx tsc --noEmit && npx tsx scripts/apply-asset-sync.ts
```

This diffs against `known-assets.json` and applies **conservative, one-way**
updates only:
- Model/display name is always synced if it changed (informational, no risk).
- Status only moves *forward* in each lifecycle (`ASSIGNED → RETURN_REQUESTED
  → RETURNED` for computers; `PENDING_APPROVAL → ASSIGNED → RETURN_REQUESTED
  → RETURNED` for mobiles) — never backward, and never touches a record
  already in a terminal state in our app (`RETURNED`, `BOUGHT_BACK`,
  `PORTED_OUT`, `DISCONNECTED`), even if ServiceNow still shows it Deployed.
  That mismatch usually just means SNOW hasn't caught up with our own
  offboarding flow yet.
- Anything ambiguous (SNOW says something our status history doesn't agree
  with, e.g. status would move backward) is **flagged in the console output,
  not auto-applied** — read the "flagged for manual review" section of the
  script's output and decide by hand.
- Tags in `known-assets.json` that don't appear in `asset-sync-results.json`
  are reported as "not found in this batch" — could just mean you skipped a
  batch, or the tag changed in SNOW; not auto-flagged as returned/lost.

### B4. Confirm

Check the script's console summary (updated / flagged / not-found /
unchanged counts). No deploy needed — same shared-DB reasoning as Part A.

### Cleanup

`known-assets.json` and `asset-sync-results.json` are working files, fine to
leave in place (next run overwrites them) — they're not read by the deployed
app.

---

## Part C — CW report emails (Gmail)

Reut Arieli (reut_arieli@intuit.com, an external Magnit recruiter) sends a
periodic report of active contingent workers and their contract end dates.
Roy only needs the end date per worker, added to the same Exit Processes
list as the QuickBase-sourced FTE terminations (see the `ExitProcess` model
— `source: "CW_REPORT"` rows, keyed by `employeeName` since this source has
no email address, only a name).

**Subject wording is inconsistent** — seen so far: "IL CWs January 2026
Report", "CWs updated report, March 2026", "CW updated Engagement Data
Report". Don't match on an exact subject; search broadly instead.

### C1. Find the latest report

```
search_threads: from:reut_arieli@intuit.com "CW" report
```

Take the **most recent thread's original report message** (not follow-up
replies) — later reports supersede earlier ones; the same workers reappear
with updated end dates each time, so only the newest full table matters.
Skip this part of the sync entirely if the latest thread found is one
you've already imported (compare its date against `syncedAt` on existing
`CW_REPORT` rows, or just re-run — it's a harmless no-op if nothing's new).

### C2. Parse the table

Fetch the message with `get_message` (`messageFormat: PLAIN_TEXT`). The
table linearizes into repeating groups of 4–5 lines after the header row —
either `Manager / Worker / Start Date / Est. End Date` or the same with a
trailing `Job Title`. Only `Worker` (name) and `Est. End Date` matter.
Convert each worker name from "Last, First" to "First Last" (e.g. "Alon,
Eitan" → "Eitan Alon") and the date from `MM/DD/YYYY` to ISO
(`YYYY-MM-DD`).

### C3. Write the data and import

Overwrite `scripts/cw-report-data.json` with the full fresh array (every
worker row from the latest report, not just new ones — the importer
upserts by name so it safely overwrites stale end dates too):

```json
[{ "employeeName": "Eitan Alon", "terminationDate": "2026-07-31" }]
```

Then run:

```bash
cd "/Users/rkuperman/Emplyee lifecycle" && npx tsc --noEmit && npx tsx scripts/import-cw-reports.ts
```

No deploy needed — same shared-DB reasoning as Parts A/B.
