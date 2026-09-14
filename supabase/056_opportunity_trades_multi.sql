-- Converts Opportunity's Trade from a single value into a multi-select list, mirroring migration 026's
-- identical conversion of sites.trade -> sites.trades. An opportunity can now carry more than one Trade
-- (e.g. Snow Removal + Landscaping), each chosen from the same fixed TRADE_OPTIONS list Sites already use.

alter table crm_opportunities
  add column if not exists trades text[] not null default '{}'::text[];

update crm_opportunities
  set trades = array[work_type]
  where work_type is not null and work_type <> '' and trades = '{}'::text[];

alter table crm_opportunities
  drop column if exists work_type;

create index if not exists crm_opportunities_trades_idx on crm_opportunities using gin (trades);
