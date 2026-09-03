-- Correction to 047: a rate card ties to a Contract, not directly to a Company -- a client can have multiple
-- contracts (different accounts/regions), each with its own negotiated rate card. Company is still reachable,
-- just one layer up, through the contract. Replace company_id with contract_id.
alter table rate_items drop column if exists company_id;
alter table rate_items add column if not exists contract_id uuid references crm_contracts(id) on delete cascade;

create index if not exists rate_items_contract_id_idx on rate_items (contract_id);
