-- Adds role-context fields to Contacts: whether they can approve work and up to what dollar amount, and a
-- free-text region/territory label. Also lets a Contact carry a list of Sites they're responsible for --
-- many-to-many, since a site can have more than one responsible contact (e.g. primary + backup) and a
-- contact can be responsible for several sites.

alter table crm_contacts
  add column if not exists can_approve_work boolean not null default false,
  add column if not exists approval_limit numeric,
  add column if not exists region text;

create table if not exists crm_contact_sites (
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  primary key (contact_id, site_id)
);

alter table crm_contact_sites enable row level security;

create policy "Users manage their own CRM contact sites"
  on crm_contact_sites for all
  using (
    exists (
      select 1 from crm_contacts c
      where c.id = contact_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from crm_contacts c
      where c.id = contact_id and c.user_id = auth.uid()
    )
  );
