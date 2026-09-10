-- Custom properties for CRM records: user-defined Fields, organized into Classes, attached to a CRM object
-- type (Company, Contact, Opportunity, Contract -- more can be added later without a schema change, since
-- object_type is just a text tag, not a foreign key to separate tables per type).
--
-- crm_field_values is a generic EAV table keyed by (field_id, record_id) rather than a column per object
-- type: record_id points at whichever table object_type says it does (crm_companies.id, crm_contacts.id,
-- etc.), enforced at the app layer, not by a DB foreign key, since it varies by row.

create table if not exists crm_field_classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  object_type text not null,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_field_classes_object_type_idx on crm_field_classes (object_type);

alter table crm_field_classes enable row level security;

create policy "Users manage their own field classes"
  on crm_field_classes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists crm_fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  object_type text not null,
  class_id uuid not null references crm_field_classes(id) on delete cascade,
  name text not null,
  label text not null,
  field_type text not null,
  -- Only set (a JSON array of strings) when field_type = 'Dropdown'.
  options jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (object_type, name)
);

create index if not exists crm_fields_class_id_idx on crm_fields (class_id);
create index if not exists crm_fields_object_type_idx on crm_fields (object_type);

alter table crm_fields enable row level security;

create policy "Users manage their own fields"
  on crm_fields for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists crm_field_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  field_id uuid not null references crm_fields(id) on delete cascade,
  record_id uuid not null,
  value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (field_id, record_id)
);

create index if not exists crm_field_values_record_id_idx on crm_field_values (record_id);

alter table crm_field_values enable row level security;

create policy "Users manage their own field values"
  on crm_field_values for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
