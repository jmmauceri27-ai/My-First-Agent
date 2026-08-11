# Window & Door Surplus — E-commerce Site

A storefront + admin inventory system for selling windows/doors (including
one-off custom/overstock "graveyard" units) built with Next.js, Prisma
(Postgres), NextAuth, Stripe Checkout, and Vercel Blob for photos.

- **Storefront** (`/`, `/products`, `/products/[slug]`, `/cart`): browse,
  filter, add to cart, checkout via Stripe.
- **Admin** (`/admin`, password-protected): manage inventory — price,
  quantity, description, category, publish/unpublish, photos — and view
  orders.

## Tech stack

| Concern         | Choice                                             |
| ---------------- | --------------------------------------------------- |
| Framework        | Next.js 16 (App Router, Server Actions)             |
| Database         | Postgres via Prisma ORM 7 (driver adapter: `pg`)    |
| Auth             | NextAuth v5, single admin login (email/password)    |
| Payments         | Stripe Checkout                                     |
| Image storage    | Vercel Blob                                         |

## 1. Local development setup

### Prerequisites

- Node.js 20+
- A Postgres database (local install, or a free hosted one — see below)

### Install & configure

```bash
cd web
npm install
cp .env.example .env   # if you don't already have a .env — see below for values
```

Fill in `.env`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/windowdoor?schema=public"
AUTH_SECRET="<run: openssl rand -base64 32>"

STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

Notes:
- `AUTH_SECRET`, `STRIPE_*`, and `BLOB_READ_WRITE_TOKEN` are only required
  for the features that use them (login, checkout, photo uploads
  respectively) — the site will run and mostly work without them, but
  those specific actions will error until set.
- The storefront/admin never needs the Stripe *publishable* key server-side;
  it's included for if/when you add Stripe.js on the client (e.g. an
  embedded payment element instead of redirecting to Stripe Checkout).

### Database

```bash
npx prisma migrate dev      # creates tables
npx tsx scripts/create-admin.ts you@example.com "a-strong-password" "Your Name"
```

### Import the inventory spreadsheet

The site was built around a manufacturer "graveyard" order-list CSV (one
row per custom window/door unit, grouped by PO/job, with occasional
child rows for screens/parts). To import it:

```bash
npx tsx scripts/import-inventory.ts path/to/your-list.csv
```

- Every imported product starts **unpublished with no price** — go to
  `/admin/products` to review, price, categorize, and publish each one
  (or bulk-edit) before it appears on the storefront.
- Re-running the script is safe: it upserts by a generated SKU, so
  re-importing an updated CSV won't duplicate products or clobber prices
  you've already set for rows that still map to the same SKU.
- Pass `--reset` to wipe all existing products first (useful in dev only —
  **do not use `--reset` against production data**).
- See `src/lib/import/parseGraveyardCsv.ts` for exactly how rows are
  parsed: group headers vs. line items, child-row (e.g. `9a` screen) →
  parent (`9` window) linking, and consecutive-identical-row → quantity
  grouping. `src/lib/import/categorize.ts` has the keyword rules used to
  guess Window vs. Door vs. Screen vs. Accessory — correct any misses in
  the admin UI.
- If your spreadsheet's format differs from the "graveyard list" (e.g. you
  get a normal SKU/price/qty catalog next time), that CSV shape needs its
  own parser — ask for one rather than forcing it through this script.

### Run it

```bash
npm run dev
```

- Storefront: http://localhost:3000
- Admin: http://localhost:3000/admin/login

## 2. Deploying to production

### Recommended stack: Vercel + Neon (or Vercel Postgres) + Stripe + Vercel Blob

1. **Database** — create a Postgres database (e.g. [Neon](https://neon.tech)
   free tier, or Vercel Postgres from the Vercel dashboard's Storage tab).
   Copy its connection string into `DATABASE_URL`.
2. **Vercel Blob** — in your Vercel project, go to Storage → Create →
   Blob. Copy the `BLOB_READ_WRITE_TOKEN` it gives you.
3. **Stripe**:
   - Create a Stripe account, grab your API keys from the Dashboard
     (Developers → API keys). Use test keys first.
   - After deploying, add a webhook endpoint in the Stripe Dashboard
     (Developers → Webhooks) pointing at
     `https://yourdomain.com/api/webhooks/stripe`, subscribed to the
     `checkout.session.completed` event. Copy the signing secret into
     `STRIPE_WEBHOOK_SECRET`.
   - When ready to accept real payments, switch to live keys (and add a
     live-mode webhook endpoint too — test and live webhooks are separate).
4. **Deploy to Vercel**:
   ```bash
   npx vercel
   ```
   or connect the GitHub repo in the Vercel dashboard. Set the **Root
   Directory** to `web/` (this Next.js app lives in a subdirectory of the
   repo). Add all the env vars from your `.env` in the Vercel project
   settings (Environment Variables), using your production `DATABASE_URL`,
   Stripe keys, Blob token, and `AUTH_SECRET`. Set
   `NEXT_PUBLIC_SITE_URL` to your real domain.
5. **Run migrations against production** (from your machine, with
   `DATABASE_URL` pointed at the production database):
   ```bash
   npx prisma migrate deploy
   npx tsx scripts/create-admin.ts you@example.com "a-strong-password"
   npx tsx scripts/import-inventory.ts path/to/list.csv
   ```

### Other hosting

Any Node.js host that supports Next.js (Railway, Render, Fly.io, a VPS,
etc.) will work — swap Vercel Blob for another object store (S3,
Cloudflare R2) if you're not on Vercel, by changing `src/app/admin/products/actions.ts`'s
`put`/`del` calls to that provider's SDK.

## 3. Day-to-day admin use

- **Add inventory manually**: `/admin/products/new`.
- **Bulk-import a new spreadsheet drop**: re-run `import-inventory.ts`
  with the new CSV; review/publish the new unpublished rows.
- **Take a product down**: toggle "Unpublished" from the product list or
  edit page (doesn't delete it — just hides it from the storefront).
- **Photos**: upload from a product's edit page. First photo shown is
  used as the thumbnail everywhere.
- **Orders**: `/admin/orders` — created automatically when a Stripe
  checkout completes (via the webhook). Fulfillment (marking
  shipped/picked-up) isn't wired up yet — start there if you want that
  next.

## Known gaps / next steps

- No shipping-cost calculation — Stripe Checkout collects a shipping
  address but doesn't charge for freight. Given these are often large,
  heavy, custom items, you likely want local pickup or a manual
  freight quote rather than instant checkout shipping rates — worth a
  conversation before launch.
- No customer accounts / order history — checkout is guest-only.
- No sales tax calculation — add Stripe Tax if you need it.
- Order fulfillment status (packed/shipped/delivered) isn't tracked yet,
  just Stripe payment status.
