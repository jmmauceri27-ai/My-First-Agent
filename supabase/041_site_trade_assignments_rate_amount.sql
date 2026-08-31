-- Adds a Rate Amount per (site, trade), shown in the Rates section next to Rate Frequency. This is a
-- separate figure from contract_value (what's tracked in the Vendor & Contract assignments area) -- it starts
-- blank for every existing trade assignment rather than inheriting contract_value.
alter table site_trade_assignments add column if not exists rate_amount numeric;
