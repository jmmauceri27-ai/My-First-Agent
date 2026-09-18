-- Rate items could only be scoped two ways: the fully generic catalog (no contract_id) or one specific
-- Agreement's negotiated rate card (contract_id set). There was no way to price a client's on-demand work --
-- rates that apply to that client regardless of which (if any) agreement is active. Adds company_id so a rate
-- item can be scoped to a Client directly. Only meaningful when contract_id is null (a contract already
-- implies its own company via the join) -- the app enforces that invariant, so company_id and contract_id are
-- never both set on the same row.

alter table rate_items
  add column if not exists company_id uuid references crm_companies(id) on delete cascade;

create index if not exists rate_items_company_id_idx on rate_items (company_id);
