-- Lets an Agreement carry a list of associated Contacts (e.g. the client's on-site manager, the person who
-- signed it), mirroring the existing crm_opportunity_contacts junction for Opportunities. This is what lets
-- a Contact show its full history of both opportunities and agreements it's been tied to.
--
-- crm_contracts = Agreements. crm_contacts = the people (Contacts). Naming the two FK columns below exactly
-- like crm_opportunity_contacts's (contract_id / contact_id) keeps this table's DAL code a direct mirror of
-- setOpportunityContacts, so double-check the two table names above if editing this file by hand.

create table if not exists crm_contract_contacts (
  contract_id uuid not null references crm_contracts(id) on delete cascade,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  primary key (contract_id, contact_id)
);

alter table crm_contract_contacts enable row level security;

create policy "Users manage their own CRM agreement contacts"
  on crm_contract_contacts for all
  using (
    exists (
      select 1 from crm_contracts c
      where c.id = contract_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from crm_contracts c
      where c.id = contract_id and c.user_id = auth.uid()
    )
  );
