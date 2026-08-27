# Employee Lifecycle

Internal tool to track the Intuit employee lifecycle (FTE / CW / OSP) — hiring, hardware/mobile refresh, and offboarding — including the Partner phone-line forms and reminder notifications.

## Setup

Needs a Postgres database (`DATABASE_URL` + `DIRECT_URL` in `.env` — see below).

```bash
npm install
npx prisma migrate dev
npm run dev
```

App runs at http://localhost:3000.

## Deployment

Live at https://emplyee-lifecycle.vercel.app, deployed via `npx vercel deploy --prod`. Database is Neon Postgres (provisioned through Vercel's Storage integration), with `DATABASE_URL` (pooled) and `DIRECT_URL` (direct, used for migrations) set both locally in `.env` and in the Vercel project's environment variables.

No login is in front of this app — anyone with the URL can view and edit real employee/hardware data. Worth turning on Vercel's Deployment Protection (password) if this stops being just a personal tool.

## Daily scheduled checks

Two scheduled jobs, both in `src/lib/jobs.ts`:

- **`runDailyChecks()`** (8am Israel) — hardware-prep reminders, laptop/mobile refresh eligibility, the Sunday-only laptop-return and mobile-refresh-request alerts, the Sunday+Wednesday mobile-return alert, and the T-minus 21/14/7/3/1-day offboarding milestone alerts. Real T4i Israel copy lives in `src/lib/alertTemplates.ts`.
- **`runWelcomeChecks()`** (11am Israel) — new-hire useful-links Slack DM (FTE vs. CW/OSP template) and a simulated orientation calendar invite, both on the employee's first day.

Three ways to trigger each:

- **In production**: Vercel Cron Jobs (`vercel.json`) hit `GET /api/jobs/run-daily` (`0 5 * * *`) and `GET /api/jobs/run-welcome-checks` (`0 8 * * *`), both authenticated via an `Authorization: Bearer <CRON_SECRET>` header Vercel attaches automatically. **Vercel Cron schedules run in UTC** — these are 8am/11am Israel time during IDT (summer). Israel falls back to standard time (UTC+2) in winter, at which point both shift an hour earlier local time — update `vercel.json` around the DST changeover if you want them pinned to 8am/11am local.
- **Locally**: `npm run scheduler` runs both on the same local-time schedule via `node-cron`.
- **Manually**: the dashboard has a "Run daily checks now" and a "Run welcome checks now" button — same logic, useful for testing without waiting for the clock. Works both locally and in production (unauthenticated `POST`, same-origin only).

## Notifications: Slack is real, Partner email is real, everything else is simulated

Every alert writes a row to the `Notification` table regardless (visible on `/notifications`), but **Slack DMs actually send** via a bot token (`SLACK_BOT_TOKEN`, set only on Vercel's **Production** environment) — `src/lib/notifications.ts` looks the recipient up by email (`users.lookupByEmail`) and posts via `chat.postMessage`, marking the row `SENT` on success. **Email to the Partner (`PARTNER_EMAIL` in `src/lib/constants.ts`) also actually sends**, via [Resend](https://resend.com) (`RESEND_API_KEY` + `RESEND_FROM_EMAIL`, both Production-only) — `from` is the verified `kupernet.com` address, `reply-to` is set to `ADMIN_EMAIL` (`roy_kuperman@intuit.com`) so replies land in Roy's inbox. Both only fire when `VERCEL_ENV === "production"` — local dev, local test scripts, and preview deploys always fall back to logging a `SIMULATED` row instead, specifically so ad-hoc/local testing (e.g. fabricating a `today` date to exercise a scheduled check) can never message a real employee or the real Partner by accident. Email to anyone other than the Partner (the employee's own offboarding checklist, line-form links, the admin hardware-prep reminder) has no provider wired up and always logs `SIMULATED` — only Partner-bound email was asked to go live.

## Data model

See `prisma/schema.prisma`. Status/type fields are plain strings rather than native Postgres enums (a holdover from when this ran on SQLite, which has no enum support) — valid values are documented as comments in the schema and enforced in the UI/API layer. An employee can have multiple `Asset` (computer) and `MobileDevice` records (real inventory shows people carrying more than one of either, e.g. mid-refresh overlap). Most `Employee` fields besides `fullName`/`status` are optional, since bulk-imported historical records rarely have complete data — the New Hire intake form still requires them for new hires.

## Bulk data import

`scripts/import-legacy-data.ts` (run once via `npx tsx scripts/import-legacy-data.ts`) loads a ServiceNow `alm_asset` CSV export (real asset tags/serials/models, split by `model_category` into computers vs. mobile devices) cross-referenced by employee name against a supplementary mobile-line tracker xlsx (email, manager, employee type, phone number — fields the CSV doesn't have). It's idempotent per employee name (re-running skips anyone already in the DB) but the file paths are hardcoded at the top of the script — update them to point at new exports before re-running. Already-overdue refresh dates are set directly during import (not via the notification path), so re-running or triggering daily checks afterward doesn't flood Slack with "eligible for refresh" messages for hardware Roy already knows about.
