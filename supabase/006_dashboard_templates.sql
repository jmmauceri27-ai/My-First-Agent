-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Reusable dashboard templates (e.g. "Vendor Status Overview") are defined in
-- code (src/lib/templates.ts), not stored here -- this table only remembers,
-- per user, which column in a given dataset plays each role the template
-- needs (e.g. "vendor" -> "Trip Vendor Name"), so you only map columns once
-- per dataset instead of every time you view the template.

create table if not exists template_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  template_key text not null,
  dataset_id uuid not null references datasets(id) on delete cascade,
  role_mapping jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, template_key, dataset_id)
);

alter table template_bindings enable row level security;

create policy "Users manage their own template bindings"
  on template_bindings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
