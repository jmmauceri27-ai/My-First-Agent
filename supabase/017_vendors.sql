-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- First step of the Procurement -> Network rebuild. Vendors become a real,
-- first-class table (instead of an uploaded dataset) so they can be linked
-- directly to Sites and clicked into for detail.

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  services text,
  contact_name text,
  email text,
  phone text,
  website text,
  address text,
  city text,
  state text,
  lat numeric,
  lng numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table vendors enable row level security;

create policy "Users manage their own vendors"
  on vendors for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
