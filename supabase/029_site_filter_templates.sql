-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Lets a user save their current Sites screen filter selections (Client,
-- Vendor, Sub-Vendor, Contract, Trade, Color mode, Address/Info search) as a
-- named template, so a common filter combination can be re-applied later
-- with one click instead of re-picking every dropdown.

create table if not exists site_filter_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_filter_templates_user_id_idx on site_filter_templates (user_id);

alter table site_filter_templates enable row level security;

create policy "Users manage their own site filter templates"
  on site_filter_templates for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
