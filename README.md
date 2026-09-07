# Fantasy Draft Hub

A personal, always-on fantasy football draft prep hub: player rankings, tiers,
tags, a running notes/trends timeline, a printable tier board, and a live
draft-day tracker. Built with Next.js + Postgres so your data syncs across
every device the moment you save it — no local files to keep in sync.

> This repo also contains an earlier, unrelated project (a UtilizeCore data
> analyst CLI), moved into `python-analyst-agent/` so it doesn't confuse
> Vercel's build detection — a `requirements.txt` at the repo root makes
> Vercel try to build the whole repo as a Python app instead of Next.js.
> The draft hub itself lives under `src/`, `prisma/`, and the config files
> at the repo root.

## Features

- **Players** — add players one at a time or bulk-import via pasted CSV.
  Track overall rank, position rank, ADP, tier, bye week, tags (target,
  sleeper, breakout, bust, injury-risk, rookie, handcuff, avoid, value), and a
  freeform bio/blurb. Search, filter by position, sort, star a watchlist.
- **Player detail & notes timeline** — every player has a dated log of notes,
  trends, news, and injury updates, so you can track how your opinion (or the
  market) moves over the offseason.
- **Tier Board** — a print-friendly cheat sheet grouped by tier, filterable
  by position, with a one-click "Print Cheat Sheet" button for draft day.
- **Draft Day Tracker** — mark players drafted (by you or an opponent) as
  they come off the board; the remaining board updates live; undo mistakes;
  reset the whole draft when you're done.
- **Mock Draft** — run a full snake draft against computer opponents anytime,
  using your saved league settings (team count, your draft slot, starting
  roster construction) and your own rankings. Opponents draft best-available
  by rank while respecting roster needs (they won't stockpile 3 QBs or a
  backup kicker). Every mock is saved so you can review how a draft played
  out.
- **Dashboard** — quick counts, your still-available targets/sleepers, and
  the most recent notes across your whole player pool.
- **Works on every device** — deployed as a normal website with a shared
  Postgres database, so your phone, laptop, and tablet all see the same data
  instantly. Add it to your phone's home screen for an app-like feel
  (`manifest.json` is already configured).
- **Optional passcode gate** — set `SITE_PASSWORD` to require a simple
  passcode before anyone can view the site, since it'll be a public URL.

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + Postgres
- Deploys cleanly to Vercel's free tier

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Get a Postgres database. Easiest options, all free to start:
   - [Vercel Postgres](https://vercel.com/storage/postgres) (pairs perfectly with Vercel hosting)
   - [Supabase](https://supabase.com)
   - [Neon](https://neon.tech)
3. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `DIRECT_URL`
   with the connection strings from your provider (on Supabase: the
   "Transaction pooler" string for `DATABASE_URL`, "Session pooler" for
   `DIRECT_URL` — grab both from your project's Connect dialog). Leave
   `SITE_PASSWORD` blank for local dev.
4. Push the schema to your database:
   ```bash
   npx prisma db push
   ```
5. Run the dev server:
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000.

## Deploying to Vercel (so it's live on every device)

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Add a Postgres database from the Vercel Storage tab, or set
   `DATABASE_URL` and `DIRECT_URL` in the project's Settings → Environment
   Variables with connection strings from your own provider (e.g. Supabase's
   pooled and session-pooler URLs).
4. Optionally set `SITE_PASSWORD` in the same Environment Variables screen
   to gate the site behind a passcode.
5. Deploy. The build command (`prisma generate && prisma db push && next build`)
   automatically syncs the database schema on every deploy — no manual
   migration step needed.
6. Open the Vercel-provided URL on your phone, tablet, and laptop — you're
   all set. On mobile, use "Add to Home Screen" for a quick-launch icon.

## Bulk-importing your rankings

Go to **Players → Bulk Import CSV** and paste rows in this format (header
row optional):

```
name,position,team,byeWeek,overallRank,positionRank,adp,tier,tags,bio
Example Player,RB,KC,10,1,1,1.2,1,target|value,Example row
```

- `tags` supports multiple values separated by `|` (pipe).
- Importing a name+position that already exists updates that player instead
  of creating a duplicate, so you can re-import updated rankings anytime.

## Project structure

```
src/app/            Next.js App Router pages (dashboard, players, board, draft, login)
src/app/players/actions.ts   Server actions for player CRUD, notes, CSV import
src/app/draft/actions.ts     Server actions for draft-day tracking
src/components/     Shared UI (nav bar)
src/lib/            Prisma client, shared constants, passcode-auth helper
prisma/schema.prisma  Data model (Player, Note)
middleware.ts       Optional passcode gate
```
