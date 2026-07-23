-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) schema.sql and 002_crm.sql, which you've already run.
-- Adds file attachments (Excel, PDF, etc.) to CRM opportunities: a private Storage
-- bucket to hold the file bytes, plus a table tracking which file belongs to which
-- opportunity. All access goes through the app's service-role server actions, the
-- same way every other table in this app is accessed, so no anon/public policies
-- are needed on the bucket.

create table if not exists crm_opportunity_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  opportunity_id uuid not null references crm_opportunities(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  content_type text,
  size_bytes bigint not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists crm_opportunity_files_opportunity_id_idx on crm_opportunity_files (opportunity_id);

alter table crm_opportunity_files enable row level security;

create policy "Users manage their own CRM opportunity files"
  on crm_opportunity_files for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('crm-attachments', 'crm-attachments', false)
on conflict (id) do nothing;
