-- Contract moves from a single field on the whole site (like Client) to a per-trade field on
-- site_trade_assignments, same as Vendor/Sub-Vendor -- so one site can belong to multiple contracts, e.g.
-- Snow Removal under Contract A and Landscaping under Contract B.

alter table site_trade_assignments
  add column if not exists contract_id uuid references crm_contracts(id) on delete set null;

create index if not exists site_trade_assignments_contract_id_idx on site_trade_assignments (contract_id);

-- Best-effort carry-forward: copy each site's existing single contract onto all of its trade assignments.
update site_trade_assignments sta
set contract_id = s.contract_id
from sites s
where sta.site_id = s.id and s.contract_id is not null and sta.contract_id is null;

alter table sites drop column if exists contract_id;
