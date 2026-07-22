-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor).
-- Creates the tables and row-level security policies used by the dashboard app.

create extension if not exists "pgcrypto";

create table if not exists datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  display_name text not null,
  category text not null,
  source_filename text,
  row_count integer not null default 0,
  columns jsonb not null default '[]'::jsonb,
  uploaded_at timestamptz not null default now(),
  unique (user_id, display_name)
);

create table if not exists dataset_rows (
  id bigint generated always as identity primary key,
  dataset_id uuid not null references datasets(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  row_index integer not null,
  data jsonb not null
);

create index if not exists dataset_rows_dataset_id_idx on dataset_rows (dataset_id);

create table if not exists dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  config jsonb not null default '{"cards": []}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table datasets enable row level security;
alter table dataset_rows enable row level security;
alter table dashboards enable row level security;

create policy "Users manage their own datasets"
  on datasets for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage their own dataset rows"
  on dataset_rows for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage their own dashboards"
  on dashboards for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
