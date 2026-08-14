-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run.
-- Lets a Site link back to a signed Contract (crm_contracts), not just a
-- Client and Opportunity -- for sites that belong to an existing contract
-- rather than (or in addition to) a pipeline deal.

alter table sites
  add column if not exists contract_id uuid references crm_contracts(id) on delete set null;

create index if not exists sites_contract_id_idx on sites (contract_id);
