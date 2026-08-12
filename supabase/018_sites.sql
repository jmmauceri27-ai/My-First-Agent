-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Second step of the Procurement -> Network rebuild. Sites become a real,
-- first-class table shared across the whole app, replacing both the old
-- Procurement dataset-driven site map and CRM's per-opportunity
-- crm_opportunity_sites. Every site can optionally link back to the Client
-- (crm_companies), the Opportunity/RFP it came from, and the Vendor
-- assigned to it -- this is the "everything connects" backbone.

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  company_id uuid references crm_companies(id) on delete set null,
  opportunity_id uuid references crm_opportunities(id) on delete set null,
  vendor_id uuid references vendors(id) on delete set null,
  name text not null,
  address text,
  lat numeric,
  lng numeric,
  contract_value numeric,
  sub_price numeric,
  measurements jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sites_company_id_idx on sites (company_id);
create index if not exists sites_opportunity_id_idx on sites (opportunity_id);
create index if not exists sites_vendor_id_idx on sites (vendor_id);

alter table sites enable row level security;

create policy "Users manage their own sites"
  on sites for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
