-- Splits Fields into two tiers:
--   * Standard fields (is_standard = true, the default -- everything created before this migration stays
--     exactly as it behaves today) render unconditionally on every record of their object type.
--   * Custom fields (is_standard = false) only render on a record once explicitly attached to it via
--     crm_field_assignments -- e.g. adding "Trigger" to one Snow contract without it appearing on every
--     other contract.

alter table crm_fields add column if not exists is_standard boolean not null default true;

create table if not exists crm_field_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  field_id uuid not null references crm_fields(id) on delete cascade,
  record_id uuid not null,
  created_at timestamptz not null default now(),
  unique (field_id, record_id)
);

create index if not exists crm_field_assignments_record_id_idx on crm_field_assignments (record_id);

alter table crm_field_assignments enable row level security;

create policy "Users manage their own field assignments"
  on crm_field_assignments for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
