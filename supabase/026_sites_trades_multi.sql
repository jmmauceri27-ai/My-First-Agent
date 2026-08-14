-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor),
-- in addition to (not instead of) the earlier migrations you've already run
-- (this must run AFTER 025_sites_trade.sql).
-- Converts Trade from a single free-text value into a multi-select list, so a
-- site can carry more than one Trade (e.g. Snow Removal + Parking Lot
-- Maintenance) chosen from a fixed set of options.

alter table sites
  add column if not exists trades text[] not null default '{}'::text[];

update sites
  set trades = array[trade]
  where trade is not null and trade <> '' and trades = '{}'::text[];

alter table sites
  drop column if exists trade;

create index if not exists sites_trades_idx on sites using gin (trades);
