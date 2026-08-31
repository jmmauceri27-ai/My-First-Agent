-- Replaces the single Rate Amount / Rate Frequency fields with a per-month rate schedule per (site, trade) --
-- e.g. a fixed-monthly client paid Mar-Nov: {"Mar": 1200, "Apr": 1200, ..., "Nov": 1200}. The pattern (which
-- months get paid, and how much) repeats every year until changed, so it isn't tied to a specific calendar year.
alter table site_trade_assignments add column if not exists rate_schedule jsonb not null default '{}'::jsonb;

alter table site_trade_assignments drop column if exists rate_amount;
alter table site_trade_assignments drop column if exists rate_frequency;
