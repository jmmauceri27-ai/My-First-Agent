-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Backs the Procurement "Vendor Prospecting Network" map -- a second,
-- independent map for prospective/available vendors and the services they
-- cover, alongside (not merged with) the Site Map. Same shape as
-- site_map_bindings/site_map_views minus the margin-specific columns, since
-- vendors don't have a contract value or sub price to compute margin from.

create table if not exists vendor_map_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  lat_column text not null,
  lng_column text not null,
  label_column text,
  popup_columns jsonb not null default '[]',
  filter_columns jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (user_id, dataset_id)
);

alter table vendor_map_bindings enable row level security;

create policy "Users manage their own vendor map bindings"
  on vendor_map_bindings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists vendor_map_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  name text not null,
  color_column text not null,
  color_mode text not null check (color_mode in ('gradient', 'categorical')),
  created_at timestamptz not null default now(),
  unique (user_id, dataset_id, name)
);

alter table vendor_map_views enable row level security;

create policy "Users manage their own vendor map views"
  on vendor_map_views for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
