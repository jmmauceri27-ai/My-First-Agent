-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Adds a Contracts table to the CRM: existing signed contracts (as opposed to
-- crm_opportunities, which is the open pipeline), with a validity window,
-- rate, site count, and type of work.

create table if not exists crm_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  company_id uuid references crm_companies(id) on delete set null,
  name text not null,
  work_type text,
  site_count integer,
  rate_amount numeric,
  rate_frequency text,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_contracts_company_id_idx on crm_contracts (company_id);
create index if not exists crm_contracts_end_date_idx on crm_contracts (end_date);

alter table crm_contracts enable row level security;

create policy "Users manage their own CRM contracts"
  on crm_contracts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
