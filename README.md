# Facility Maintenance Dashboard

A private web app for uploading Excel/CSV exports from your facility
maintenance company (work orders, invoices, proposals, and more) and building
custom KPI dashboards from that data.

Built with **Next.js** (App Router) + **Supabase** (Postgres + Auth), meant to
be deployed on **Vercel**.

## Features

- **Sign-in gated** — Supabase Auth (email/password). There's no public
  sign-up; you create your account directly in the Supabase dashboard.
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

### 2. Create your user account

There is no public sign-up page by design. In the Supabase dashboard, go to
**Authentication -> Users -> Add user** and create an account with your
email and a password. That's the account you'll log in with.

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your project's URL and
anon key (Supabase dashboard: **Settings -> API**):

```bash
cp .env.local.example .env.local
```

### 4. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and sign in with the account you created.

## Deploying to Vercel

1. Push this repo/branch to GitHub (already done if you're reading this
   from there).
2. In Vercel, **Add New Project** and import the repo.
3. In the project's **Settings -> Environment Variables**, add
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the
   same values as your `.env.local`.
4. Deploy.

Since data lives in Supabase rather than on local disk, it persists across
every redeploy — unlike a filesystem-based approach, there's nothing to lose
when Vercel spins up a fresh instance.

## Project layout

```
src/
  app/
    login/            Sign-in page + auth server actions
    page.tsx           Overview (protected home page)
    upload/             Upload Data page
    builder/            Dashboard Builder page
    dashboards/         Dashboards viewer page
    explorer/           Data Explorer page
  components/
    AppShell.tsx        Layout wrapper (hides nav on /login)
    NavBar.tsx
  lib/
    supabase/           Browser/server Supabase clients + auth proxy helper
    dal.ts              Data access layer (all Supabase queries)
    parse.ts            Excel/CSV parsing (exceljs + papaparse)
    kpi.ts              KPI + chart aggregation logic
    types.ts            Shared types
  proxy.ts               Next.js 16 "proxy" (formerly middleware) — auth gate
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
