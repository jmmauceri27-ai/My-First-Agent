-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Backs the Procurement "Site Map" feature: remembers, per user and dataset,
-- which columns hold latitude/longitude/label/popup info so a site-locations
-- sheet only needs to be mapped once, then always renders as pins on a map.

create table if not exists site_map_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  lat_column text not null,
  lng_column text not null,
  label_column text,
  popup_columns jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (user_id, dataset_id)
);

alter table site_map_bindings enable row level security;

create policy "Users manage their own site map bindings"
  on site_map_bindings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
