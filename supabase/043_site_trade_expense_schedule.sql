-- Mirrors rate_schedule (migration 042) on the expense side: which months we pay the Vendor, and how much, and
-- separately which months the Sub-Vendor gets paid, and how much -- per (site, trade). Same recurring-every-year
-- pattern as rate_schedule; tracked separately from the flat sub_price/sub_vendor_price fields.
alter table site_trade_assignments add column if not exists vendor_expense_schedule jsonb not null default '{}'::jsonb;
alter table site_trade_assignments add column if not exists sub_vendor_expense_schedule jsonb not null default '{}'::jsonb;
