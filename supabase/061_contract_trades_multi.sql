-- Converts Agreement's Trade from a single value into a multi-select list, mirroring migrations 026 (Sites)
-- and 056 (Opportunities). An agreement can now carry more than one Trade (e.g. Snow Removal + Landscaping),
-- each chosen from the same fixed TRADE_OPTIONS list Sites and Opportunities already use.

alter table crm_contracts
  add column if not exists trades text[] not null default '{}'::text[];

update crm_contracts
  set trades = array[work_type]
  where work_type is not null and work_type <> '' and trades = '{}'::text[];

alter table crm_contracts
  drop column if exists work_type;

create index if not exists crm_contracts_trades_idx on crm_contracts using gin (trades);
