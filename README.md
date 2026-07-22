# Facility Maintenance Dashboard

A private web app for uploading Excel/CSV exports from your facility
maintenance company (work orders, invoices, proposals, and more) and building
custom KPI dashboards from that data.

Built with **Next.js** (App Router) + **Supabase** (Postgres + Auth), meant to
be deployed on **Vercel**.

> **⚠️ Login is currently disabled.** The site runs on the Supabase
> service-role key server-side instead of per-request sign-in, so anyone
> with the URL can view and edit the data. See
> [Re-enabling login](#re-enabling-login) to turn it back on.

## Features

- **Upload Data** — upload `.xlsx`/`.csv` files. Each sheet in a workbook
  becomes its own dataset, tagged with a category (Work Orders, Invoices,
  Proposals, Vendors, Properties, Other).
- **Dashboard Builder** — assemble dashboards from KPI cards (sum, average,
  count, min, max, % of rows matching a filter, count of distinct values) and
  chart cards (bar, line, pie, area, scatter), each built against any
  uploaded dataset with an optional filter.
- **Dashboards** — view saved dashboards with live-computed KPIs and charts.
- **Data Explorer** — browse any dataset, filter it, and export the filtered
  view back to Excel.

Data is stored in Supabase Postgres (not in memory), so it persists across
deploys and sessions, and multiple uploads over time can be compared.

## Setup

### 1. Create a Supabase project

Create a new project at [supabase.com](https://supabase.com). Then, in the
SQL Editor, run the contents of [`supabase/schema.sql`](./supabase/schema.sql)
once — it creates the `datasets`, `dataset_rows`, and `dashboards` tables
with row-level security so each account only ever sees its own data.

### 2. Create a user account

Even with login disabled, the database schema still ties every row to a
`user_id` (a real Supabase Auth user), so one still needs to exist. In the
Supabase dashboard, go to **Authentication -> Users -> Add user** and create
an account (email + password). Copy its **User UID** — you'll need it below.

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase
  dashboard: **Settings -> API**
- `SUPABASE_SERVICE_ROLE_KEY` — same page, the **service_role secret** key.
  **Never** prefix this with `NEXT_PUBLIC_` — it must stay server-only.
- `APP_OWNER_USER_ID` — the User UID from step 2.

```bash
cp .env.local.example .env.local
```

### 4. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — no sign-in required while login is disabled.

## Deploying to Vercel

1. Push this repo/branch to GitHub (already done if you're reading this
   from there).
2. In Vercel, **Add New Project** and import the repo.
3. In the project's **Settings -> Environment Variables**, add all four
   variables from `.env.local` (same values).
4. Deploy.

Since data lives in Supabase rather than on local disk, it persists across
every redeploy — unlike a filesystem-based approach, there's nothing to lose
when Vercel spins up a fresh instance.

## Re-enabling login

To turn the login gate back on:

1. In `src/proxy.ts`, replace the body with the commented-out version at the
   top of that file (it calls `updateSession` from `src/lib/supabase/proxy.ts`,
   which was left untouched the whole time).
2. In `src/lib/dal.ts`, swap `createAdminClient()` / `OWNER_USER_ID` back for
   the cookie-based client (`createClient` from `./supabase/server`) and a
   real `supabase.auth.getUser()` check in `ingestDataset` and `saveDashboard`
   (see git history on this file for the previous version).
3. Add a "Log out" button back to `src/components/NavBar.tsx` (a form posting
   to `logout` from `src/app/login/actions.ts`).
4. `SUPABASE_SERVICE_ROLE_KEY` / `APP_OWNER_USER_ID` are no longer needed at
   that point, but leaving them set doesn't hurt anything.

## Project layout

```
src/
  app/
    login/            Sign-in page + auth server actions (currently unused)
    page.tsx           Overview (home page)
    upload/             Upload Data page
    builder/            Dashboard Builder page
    dashboards/         Dashboards viewer page
    explorer/           Data Explorer page
  components/
    AppShell.tsx        Layout wrapper
    NavBar.tsx
    ChartRenderer.tsx    Shared Recharts wrapper
    DashboardCardsView.tsx  Shared KPI/chart rendering (Dashboards page + Builder preview)
  lib/
    supabase/
      client.ts          Browser client (unused while login is disabled)
      server.ts           Cookie-based server client (unused while login is disabled)
      admin.ts             Service-role client actually used by dal.ts right now
      proxy.ts             Session-refresh helper for src/proxy.ts (currently bypassed)
    dal.ts              Data access layer (all Supabase queries)
    parse.ts            Excel/CSV parsing (exceljs + papaparse)
    kpi.ts              KPI + chart aggregation logic
    types.ts            Shared types
  proxy.ts               Next.js 16 "proxy" (formerly middleware) — currently a no-op
supabase/
  schema.sql            Run once in the Supabase SQL editor
legacy_streamlit/         Previous Streamlit + SQLite version, kept for reference
legacy_cli/                Original CLI analyst agent, kept for reference
```

## Notes / limitations

- Only `.xlsx` and `.csv` uploads are supported (legacy binary `.xls` is not).
- Filters in the Dashboard Builder and Data Explorer are single conditions
  (column, operator, value) rather than free-text expressions, so they can
  be built with dropdowns in the UI.
