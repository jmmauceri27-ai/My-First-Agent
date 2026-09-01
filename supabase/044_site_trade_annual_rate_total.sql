-- Adds a standalone Annual Rate Total per (site, trade) -- a flat yearly figure, independently editable and
-- bulk-uploadable, tracked separately from the month-by-month rate_schedule breakdown (migration 042). The two
-- aren't kept in sync with each other on purpose.
alter table site_trade_assignments add column if not exists annual_rate_total numeric;
