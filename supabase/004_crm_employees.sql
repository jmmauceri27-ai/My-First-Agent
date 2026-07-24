-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) schema.sql, 002_crm.sql, and 003_crm_attachments.sql,
-- which you've already run.
-- Adds a lightweight "employees" tag list so you can assign a Sales Manager to
-- each opportunity, without a full employee-management section.

create table if not exists crm_employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table crm_employees enable row level security;

create policy "Users manage their own CRM employees"
  on crm_employees for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table crm_opportunities
  add column if not exists sales_manager_id uuid references crm_employees(id) on delete set null;

create index if not exists crm_opportunities_sales_manager_id_idx on crm_opportunities (sales_manager_id);
