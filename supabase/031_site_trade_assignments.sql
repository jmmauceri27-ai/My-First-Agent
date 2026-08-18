-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- A site usually doesn't have just one vendor -- one trade (e.g. Land) may go
-- to one vendor while another trade (e.g. Snow Removal) goes to a different
-- vendor. This moves Vendor/Sub-Vendor + pricing off the sites table and onto
-- a new per-(site, trade) table, so each trade a site has can carry its own
-- Vendor, Sub-Vendor, Contract Value, Sub Price, and Sub-Vendor Price.

create table if not exists site_trade_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  site_id uuid not null references sites(id) on delete cascade,
  trade text not null,
  vendor_id uuid references vendors(id) on delete set null,
  sub_vendor_id uuid references vendors(id) on delete set null,
  contract_value numeric,
  sub_price numeric,
  sub_vendor_price numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, trade)
);

create index if not exists site_trade_assignments_site_id_idx on site_trade_assignments (site_id);
create index if not exists site_trade_assignments_vendor_id_idx on site_trade_assignments (vendor_id);
create index if not exists site_trade_assignments_sub_vendor_id_idx on site_trade_assignments (sub_vendor_id);

alter table site_trade_assignments enable row level security;

create policy "Users manage their own site trade assignments"
  on site_trade_assignments for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
