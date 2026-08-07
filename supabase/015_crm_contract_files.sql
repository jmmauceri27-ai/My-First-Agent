-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Adds file attachments to CRM contracts (site lists, signed agreements,
-- insurance docs, etc.), reusing the same private "crm-attachments" Storage
-- bucket created in 003_crm_attachments.sql.

create table if not exists crm_contract_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  contract_id uuid not null references crm_contracts(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  content_type text,
  size_bytes bigint not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists crm_contract_files_contract_id_idx on crm_contract_files (contract_id);

alter table crm_contract_files enable row level security;

create policy "Users manage their own CRM contract files"
  on crm_contract_files for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
