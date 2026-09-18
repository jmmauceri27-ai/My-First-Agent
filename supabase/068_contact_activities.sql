-- A contact's own activity log -- calls, emails, and meetings logged against them, independent of any
-- Opportunity/Contract. Lets an account manager see (and add to) a contact's interaction history from their
-- CRM contact page.
create table if not exists crm_contact_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  type text not null,
  subject text,
  notes text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists crm_contact_activities_contact_id_idx on crm_contact_activities (contact_id);

alter table crm_contact_activities enable row level security;

create policy "Users manage their own contact activities"
  on crm_contact_activities for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
