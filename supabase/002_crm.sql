-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) supabase/schema.sql, which you've already run.
-- Adds the CRM tables: companies, contacts, opportunities (with a pipeline
-- stage + drag-and-drop ordering), and a contacts<->opportunities join table.

create extension if not exists "pgcrypto";

create table if not exists crm_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  address text,
  city text,
  state text,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  company_id uuid references crm_companies(id) on delete set null,
  name text not null,
  email text,
  phone text,
  title text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_contacts_company_id_idx on crm_contacts (company_id);

create table if not exists crm_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  company_id uuid references crm_companies(id) on delete set null,
  stage text not null default 'Prospecting',
  amount numeric,
  site_count integer,
  work_type text,
  expected_close_date date,
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_opportunities_company_id_idx on crm_opportunities (company_id);
create index if not exists crm_opportunities_stage_idx on crm_opportunities (stage);

create table if not exists crm_opportunity_contacts (
  opportunity_id uuid not null references crm_opportunities(id) on delete cascade,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  primary key (opportunity_id, contact_id)
);

alter table crm_companies enable row level security;
alter table crm_contacts enable row level security;
alter table crm_opportunities enable row level security;
alter table crm_opportunity_contacts enable row level security;

create policy "Users manage their own CRM companies"
  on crm_companies for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage their own CRM contacts"
  on crm_contacts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage their own CRM opportunities"
  on crm_opportunities for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage their own CRM opportunity contacts"
  on crm_opportunity_contacts for all
  using (
    exists (
      select 1 from crm_opportunities o
      where o.id = opportunity_id and o.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from crm_opportunities o
      where o.id = opportunity_id and o.user_id = auth.uid()
    )
  );
