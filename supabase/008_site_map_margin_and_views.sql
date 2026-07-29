-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Backs the Procurement site map's margin calc + custom color-by "views":
--   - site_map_bindings gains two optional columns so margin (contract value
--     minus what you pay the subcontractor) can be computed per site.
--   - site_map_views stores named "color the pins by ___" configs per dataset,
--     switchable from the map (e.g. "Price", "Snowfall").

alter table site_map_bindings
  add column if not exists contract_value_column text,
  add column if not exists sub_price_column text;

create table if not exists site_map_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  name text not null,
  color_column text not null,
  color_mode text not null check (color_mode in ('gradient', 'categorical')),
  created_at timestamptz not null default now(),
  unique (user_id, dataset_id, name)
);

alter table site_map_views enable row level security;

create policy "Users manage their own site map views"
  on site_map_views for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
