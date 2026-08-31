-- Adds a freeform Rate Frequency per (site, trade), shown next to that trade's rate amount (contract_value) --
-- e.g. "Monthly", "Per visit", "Per push". Unlike Contract.rate_frequency this isn't a fixed list, since a
-- trade's billing cadence can be worded however the contract actually specifies it.
alter table site_trade_assignments add column if not exists rate_frequency text;
