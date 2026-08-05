-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Lets each CRM opportunity ("RFP") have its own uploaded list of site
-- locations, shown as pins on a small embedded map -- separate from
-- Procurement's shared datasets/site map. Mirrors the shape of
-- datasets/dataset_rows + site_map_bindings, scoped to one opportunity.

create table if not exists crm_opportunity_site_bindings (
  opportunity_id uuid primary key references crm_opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  lat_column text not null,
  lng_column text not null,
  label_column text,
  updated_at timestamptz not null default now()
);

alter table crm_opportunity_site_bindings enable row level security;

create policy "Users manage their own opportunity site bindings"
  on crm_opportunity_site_bindings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists crm_opportunity_sites (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  opportunity_id uuid not null references crm_opportunities(id) on delete cascade,
  row_index integer not null,
  data jsonb not null
);

create index if not exists crm_opportunity_sites_opportunity_id_idx on crm_opportunity_sites (opportunity_id);

alter table crm_opportunity_sites enable row level security;

create policy "Users manage their own opportunity sites"
  on crm_opportunity_sites for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
